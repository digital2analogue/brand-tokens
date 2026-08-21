#!/usr/bin/env python3
"""
Figma-to-JSON Token Drift Auditor
==================================
Compares Figma variable state (exported via get_variable_defs) against
W3C/DTCG token JSON source of truth. Produces a structured JSON report
and a human-readable markdown summary.

Usage:
    python drift_audit.py --tokens-dir ./tokens --figma-export ./figma-vars.json
    python drift_audit.py --tokens-dir ./tokens --figma-export ./figma-vars.json --output ./drift-report

Part of River Romney's AI-Native Design System workflow (Phase 3).
"""

import argparse
import json
import math
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

# ---------------------------------------------------------------------------
# DTCG Token Parser
# ---------------------------------------------------------------------------

def parse_dtcg_tokens(tokens_dir: str) -> dict:
    """
    Walk every *.tokens.json under tokens_dir, flatten into a dict keyed
    by canonical token path (e.g. 'primitive.color.green.950').
    Each entry: { path, $value, $type, is_alias, alias_target, resolved_value, source_file }
    """
    tokens = {}
    tokens_path = Path(tokens_dir)

    for json_file in sorted(tokens_path.rglob("*.tokens.json")):
        rel = json_file.relative_to(tokens_path)
        with open(json_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        _walk_dtcg(data, [], tokens, str(rel))

    return tokens


def _walk_dtcg(node: Any, path: list, out: dict, source_file: str):
    """Recursively walk a DTCG token tree, collecting leaf tokens."""
    if not isinstance(node, dict):
        return

    # If this node has a $value, it's a token leaf
    if "$value" in node:
        token_path = ".".join(path)
        value = node["$value"]
        token_type = node.get("$type", _infer_type_from_ancestors(path))

        is_alias = False
        alias_target = None
        if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
            is_alias = True
            alias_target = value[1:-1]  # strip braces

        out[token_path] = {
            "path": token_path,
            "$value": value,
            "$type": token_type,
            "is_alias": is_alias,
            "alias_target": alias_target,
            "source_file": source_file,
        }
        return  # Don't recurse into token leaf children

    # Otherwise recurse into children (skip $ keys)
    for key, child in node.items():
        if key.startswith("$"):
            continue
        _walk_dtcg(child, path + [key], out, source_file)


def _infer_type_from_ancestors(path: list) -> Optional[str]:
    """Infer $type from common path patterns."""
    joined = ".".join(path).lower()
    if "color" in joined:
        return "color"
    if "space" in joined or "spacing" in joined:
        return "dimension"
    if "radius" in joined:
        return "dimension"
    if "duration" in joined:
        return "duration"
    if "easing" in joined:
        return "cubicBezier"
    if "font" in joined and "family" in joined:
        return "fontFamily"
    if "font" in joined and "weight" in joined:
        return "fontWeight"
    if "font" in joined and "size" in joined:
        return "dimension"
    if "lineheight" in joined or "line-height" in joined or "lineHeight" in joined:
        return "number"
    if "letter" in joined and "spacing" in joined:
        return "dimension"
    return None


# ---------------------------------------------------------------------------
# Figma Variable Parser
# ---------------------------------------------------------------------------

def parse_figma_export(figma_json: str) -> dict:
    """
    Parse the Figma variable export (from get_variable_defs / use_figma).
    Returns dict keyed by canonical name path.
    Each entry: { name, collection, resolvedType, value, is_alias, alias_name, scopes }
    """
    with open(figma_json, "r") as f:
        collections = json.load(f)

    variables = {}
    for col in collections:
        col_name = col["name"]
        for var in col.get("variables", []):
            name = var["name"]  # e.g. "color/green/200"
            # Use first mode value (single mode per collection in this system)
            modes = var.get("valuesByMode", {})
            mode_name = list(modes.keys())[0] if modes else None
            raw_value = modes.get(mode_name) if mode_name else None

            is_alias = False
            alias_name = None
            if isinstance(raw_value, dict) and raw_value.get("type") == "ALIAS":
                is_alias = True
                alias_name = raw_value.get("aliasName", "UNKNOWN")
                raw_value = raw_value  # keep the alias structure

            variables[name] = {
                "name": name,
                "collection": col_name,
                "resolvedType": var.get("resolvedType"),
                "value": raw_value,
                "is_alias": is_alias,
                "alias_name": alias_name,
                "scopes": var.get("scopes", []),
                "id": var.get("id"),
            }

    return variables


# ---------------------------------------------------------------------------
# Name Mapping: DTCG path <-> Figma variable name
# ---------------------------------------------------------------------------

# Maps DTCG token paths to their expected Figma variable names.
# The convention: DTCG uses dots, Figma uses slashes.
# Primitives collection: "primitive.color.green.200" -> "color/green/200"
# Color (semantic) collection: "color.background.default" -> "color/background/default"
# Spacing collection: "primitive.space.md" -> "space/md", "spacing.element" -> "spacing/element"
# Typography collection: "primitive.font.size.base" -> "font-size/base"
# Radius collection: "primitive.radius.md" -> "raw/md", "radius.default" -> "radius/default"
# Motion collection: "primitive.duration.fast" -> "duration/fast"

DTCG_TO_FIGMA_PREFIX_MAP = {
    # Primitives
    "primitive.color": "color",
    "primitive.space": "space",
    "primitive.icon": "icon",
    "primitive.font.family": "font-family",
    "primitive.font.weight": "font-weight",
    "primitive.font.size": "font-size",
    "primitive.font.lineHeight": "line-height",
    "primitive.letterSpacing": "letter-spacing",
    "primitive.radius": "raw",
    "primitive.duration": "duration",
    "primitive.delay": "delay",
    "primitive.easing": "easing",
    # Semantic
    "color.background": "color/background",
    "color.foreground": "color/foreground",
    "color.border": "color/border",
    "spacing": "spacing",
    "radius": "radius",
    "motion.duration": "motion/duration",
    "motion.easing": "motion/easing",
    "motion.transition": "motion/transition",
    "icon.size": "icon-size",
    "letterSpacing": "letter-spacing",
    # Typography (special handling for font-style, which is Figma-only)
}

# Additional Figma-only variables that aren't in the token JSON
# (These are expected Figma additions, not drift)
FIGMA_ONLY_EXPECTED = {
    "font-style/light",
    "font-style/regular",
    "font-style/medium",
}

# Token source files that are DE (decision-engine) brand-specific.
# The base-dark Figma file covers only the base dark theme — DE is v2.
# Tokens from these files that are missing from Figma are expected and
# excluded from the drift score.
DE_ONLY_SOURCE_FILES = {
    "brands/decision-engine.tokens.json",
    "brands\\decision-engine.tokens.json",
}


def dtcg_path_to_figma_name(dtcg_path: str) -> Optional[str]:
    """Convert a DTCG token path to its expected Figma variable name."""
    # Try each prefix mapping, longest match first
    sorted_prefixes = sorted(DTCG_TO_FIGMA_PREFIX_MAP.keys(), key=len, reverse=True)

    for prefix in sorted_prefixes:
        if dtcg_path.startswith(prefix + "."):
            suffix = dtcg_path[len(prefix) + 1:]
            figma_prefix = DTCG_TO_FIGMA_PREFIX_MAP[prefix]
            figma_name = figma_prefix + "/" + suffix.replace(".", "/")
            return figma_name
        elif dtcg_path == prefix:
            return DTCG_TO_FIGMA_PREFIX_MAP[prefix]

    return None


def figma_name_to_dtcg_path(figma_name: str, collection: str) -> Optional[str]:
    """Convert a Figma variable name back to a DTCG token path (best effort)."""
    # Reverse the mapping
    parts = figma_name.split("/")

    # Figma collection context helps disambiguate
    collection_lower = collection.lower()

    if collection_lower == "primitives":
        prefix_map = {
            "color": "primitive.color",
            "space": "primitive.space",
            "icon": "primitive.icon",
            "font-family": "primitive.font.family",
            "font-weight": "primitive.font.weight",
            "font-size": "primitive.font.size",
            "font-style": None,  # Figma-only
            "line-height": "primitive.font.lineHeight",
            "letter-spacing": "primitive.letterSpacing",
            "delay": "primitive.delay",
        }
    elif collection_lower == "color":
        prefix_map = {
            "color": "color",
        }
    elif collection_lower == "spacing":
        prefix_map = {
            "space": "primitive.space",
            "icon": "primitive.icon",
            "spacing": "spacing",
            "icon-size": "icon.size",
        }
    elif collection_lower == "typography":
        prefix_map = {
            "font-size": "primitive.font.size",
            "font-family": "primitive.font.family",
            "font-weight": "primitive.font.weight",
            "font-style": None,  # Figma-only
            "line-height": "primitive.font.lineHeight",
            "letter-spacing": "letter-spacing",
        }
        # Check if it's a semantic letter-spacing alias
        if parts[0] == "letter-spacing" and len(parts) == 2:
            if parts[1] in ("display", "title", "body", "label", "all-caps"):
                return f"letterSpacing.{parts[1]}"
            else:
                return f"primitive.letterSpacing.{parts[1]}"
    elif collection_lower == "radius":
        prefix_map = {
            "raw": "primitive.radius",
            "radius": "radius",
        }
    elif collection_lower == "motion":
        prefix_map = {
            "duration": "primitive.duration",
            "easing": "primitive.easing",
            "motion": "motion",
        }
    else:
        return None

    # Find matching prefix
    first_part = parts[0]
    # Check multi-part keys like "font-family"
    for key_len in (2, 1):
        key = "/".join(parts[:key_len]) if key_len <= len(parts) else None
        if key and key.replace("/", "-") in prefix_map:
            mapped = prefix_map.get(key.replace("/", "-"))
            break
        if key and key in prefix_map:
            mapped = prefix_map.get(key)
            break
    else:
        mapped = prefix_map.get(first_part)

    if mapped is None:
        return None  # Figma-only variable

    remainder = "/".join(parts[1:]) if len(parts) > 1 else ""
    # Handle compound first-part like "font-size"
    for key_len in (2, 1):
        compound_key = "-".join(parts[:key_len]) if key_len <= len(parts) else None
        if compound_key and compound_key in prefix_map:
            mapped = prefix_map[compound_key]
            remainder = "/".join(parts[key_len:])
            break

    if remainder:
        return mapped + "." + remainder.replace("/", ".")
    return mapped


# ---------------------------------------------------------------------------
# Value Comparison
# ---------------------------------------------------------------------------

def hex_to_rgb01(hex_str: str) -> dict:
    """Convert '#RRGGBB' to {r, g, b} in 0-1 range."""
    hex_str = hex_str.lstrip("#")
    r = int(hex_str[0:2], 16) / 255.0
    g = int(hex_str[2:4], 16) / 255.0
    b = int(hex_str[4:6], 16) / 255.0
    return {"r": r, "g": g, "b": b}


def rgb01_to_hex(r: float, g: float, b: float) -> str:
    """Convert 0-1 RGB to '#RRGGBB'."""
    return "#{:02X}{:02X}{:02X}".format(
        round(r * 255), round(g * 255), round(b * 255)
    )


def parse_dimension(value: str) -> Optional[float]:
    """Parse '16px', '1rem', '0.03em' etc to a numeric value in px."""
    if isinstance(value, (int, float)):
        return float(value)
    value = str(value).strip()
    if value.endswith("px"):
        return float(value[:-2])
    if value.endswith("rem"):
        return float(value[:-3]) * 16  # assume 1rem = 16px
    if value.endswith("em"):
        # em-based letter-spacing — return raw em value, not px
        return float(value[:-2])
    if value.endswith("ms"):
        return float(value[:-2])
    try:
        return float(value)
    except ValueError:
        return None


def colors_match(dtcg_hex: str, figma_rgba: dict, tolerance: float = 1.5) -> bool:
    """Compare DTCG hex color against Figma RGBA (0-1 range)."""
    expected = hex_to_rgb01(dtcg_hex)
    # Allow tolerance of ~1.5/255 for rounding
    t = tolerance / 255.0
    return (
        abs(expected["r"] - figma_rgba.get("r", 0)) < t
        and abs(expected["g"] - figma_rgba.get("g", 0)) < t
        and abs(expected["b"] - figma_rgba.get("b", 0)) < t
    )


def values_match(dtcg_token: dict, figma_var: dict) -> tuple[bool, str]:
    """
    Compare a DTCG token value against a Figma variable value.
    Returns (match: bool, detail: str).
    """
    token_type = dtcg_token.get("$type", "")
    dtcg_val = dtcg_token["$value"]
    figma_val = figma_var["value"]

    # Skip alias comparisons here (handled separately)
    if dtcg_token["is_alias"] or figma_var["is_alias"]:
        return _compare_aliases(dtcg_token, figma_var)

    # Color comparison
    if token_type == "color" and isinstance(dtcg_val, str) and dtcg_val.startswith("#"):
        # Direct (non-alias) COLOR values arrive as an uppercase hex string —
        # this is the export format documented for the Figma side (matches
        # get_variable_defs / export_figma_vars.py), not a raw {r,g,b} object.
        if isinstance(figma_val, str) and figma_val.startswith("#"):
            if dtcg_val.upper() == figma_val.upper():
                return True, "match"
            return False, f"JSON={dtcg_val.upper()}, Figma={figma_val.upper()}"
        if isinstance(figma_val, dict) and "r" in figma_val:
            if colors_match(dtcg_val, figma_val):
                return True, "match"
            expected_hex = dtcg_val.upper()
            actual_hex = rgb01_to_hex(figma_val["r"], figma_val["g"], figma_val["b"])
            return False, f"JSON={expected_hex}, Figma={actual_hex}"
        return False, f"type mismatch: JSON=hex color, Figma={type(figma_val).__name__}"

    # Dimension comparison
    if token_type in ("dimension", "duration"):
        dtcg_num = parse_dimension(dtcg_val)
        figma_num = figma_val if isinstance(figma_val, (int, float)) else parse_dimension(figma_val)
        if dtcg_num is not None and figma_num is not None:
            # For em-based values, Figma stores as px (need context)
            # For letter-spacing in em, Figma stores raw pixel values differently
            if isinstance(dtcg_val, str) and "em" in dtcg_val and "px" not in dtcg_val:
                # Letter-spacing: Figma stores as percentage of font size
                # This needs special handling per-context, skip strict matching
                return True, "em-based (skip strict)"
            if abs(dtcg_num - figma_num) < 0.01:
                return True, "match"
            return False, f"JSON={dtcg_num}, Figma={figma_num}"
        return False, f"unparseable: JSON={dtcg_val}, Figma={figma_val}"

    # Number comparison (line-height)
    if token_type == "number" or token_type == "fontWeight":
        dtcg_num = float(dtcg_val) if isinstance(dtcg_val, (int, float)) else parse_dimension(dtcg_val)
        figma_num = float(figma_val) if isinstance(figma_val, (int, float)) else None
        if dtcg_num is not None and figma_num is not None:
            # Line-height: DTCG uses unitless multiplier (1.6), Figma uses percentage (160)
            if token_type == "number" and figma_num > 10 and dtcg_num < 10:
                figma_num = figma_num / 100.0
            if abs(dtcg_num - figma_num) < 0.01:
                return True, "match"
            return False, f"JSON={dtcg_num}, Figma={figma_num}"

    # String comparison (font family, easing)
    if token_type == "fontFamily" or isinstance(dtcg_val, str):
        if isinstance(figma_val, str):
            if dtcg_val.strip() == figma_val.strip():
                return True, "match"
            return False, f'JSON="{dtcg_val}", Figma="{figma_val}"'

    # cubicBezier comparison
    if token_type == "cubicBezier" and isinstance(dtcg_val, list):
        if isinstance(figma_val, str):
            # Figma stores as string "cubic-bezier(...)"
            m = re.findall(r"[\d.]+", figma_val)
            if len(m) == 4:
                figma_nums = [float(x) for x in m]
                if all(abs(a - b) < 0.01 for a, b in zip(dtcg_val, figma_nums)):
                    return True, "match"
                return False, f"JSON={dtcg_val}, Figma={figma_nums}"
        return False, f"type mismatch for cubicBezier"

    # Composite typography tokens don't have direct Figma variable equivalents
    if token_type == "typography":
        return True, "composite (text styles, not variables)"

    return True, "uncompared"


def _compare_aliases(dtcg_token: dict, figma_var: dict) -> tuple[bool, str]:
    """Compare alias references between DTCG and Figma."""
    if dtcg_token["is_alias"] and figma_var["is_alias"]:
        # Both are aliases — compare targets
        dtcg_target = dtcg_token["alias_target"]  # e.g. "primitive.color.green.950"
        figma_target = figma_var["alias_name"]  # e.g. "color/green/950"

        # Convert DTCG target to Figma naming
        expected_figma_target = dtcg_path_to_figma_name(dtcg_target)
        if expected_figma_target and expected_figma_target == figma_target:
            return True, f"alias match -> {figma_target}"
        # Also try with just the suffix after known prefixes
        if expected_figma_target:
            return False, f"alias mismatch: JSON->{dtcg_target} (expect {expected_figma_target}), Figma->{figma_target}"
        return False, f"alias mismatch: JSON->{dtcg_target}, Figma->{figma_target}"

    if dtcg_token["is_alias"] and not figma_var["is_alias"]:
        return False, f"JSON is alias ({dtcg_token['alias_target']}) but Figma has raw value"
    if not dtcg_token["is_alias"] and figma_var["is_alias"]:
        return False, f"JSON has raw value but Figma is alias ({figma_var['alias_name']})"
    return True, "neither is alias"


# ---------------------------------------------------------------------------
# Drift Audit Engine
# ---------------------------------------------------------------------------

def run_audit(tokens_dir: str, figma_export: str) -> dict:
    """
    Main audit: compare DTCG tokens against Figma variables.
    Returns structured drift report.
    """
    dtcg_tokens = parse_dtcg_tokens(tokens_dir)
    figma_vars = parse_figma_export(figma_export)

    report = {
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tokens_dir": tokens_dir,
            "figma_export": figma_export,
            "total_dtcg_tokens": len(dtcg_tokens),
            "total_figma_vars": len(figma_vars),
        },
        "missing_from_figma": [],      # In JSON but not in Figma
        "de_only": [],                  # DE brand tokens — not in base-dark Figma (expected)
        "orphans_in_figma": [],         # In Figma but not in JSON
        "value_mismatches": [],         # Both exist but values differ
        "alias_mismatches": [],         # Both exist but alias targets differ
        "matched": [],                  # Perfect matches
        "skipped": [],                  # Composite types, uncompared
    }

    # Track which Figma vars have been matched
    matched_figma_names = set()

    # Filter out composite typography tokens (they map to text styles, not variables)
    non_composite_tokens = {
        k: v for k, v in dtcg_tokens.items()
        if v.get("$type") != "typography"
    }
    composite_tokens = {
        k: v for k, v in dtcg_tokens.items()
        if v.get("$type") == "typography"
    }

    for path, token in composite_tokens.items():
        report["skipped"].append({
            "dtcg_path": path,
            "reason": "composite typography token (maps to text styles, not variables)",
            "source_file": token["source_file"],
        })

    # Check each DTCG token against Figma
    for dtcg_path, token in non_composite_tokens.items():
        figma_name = dtcg_path_to_figma_name(dtcg_path)

        if figma_name is None:
            report["skipped"].append({
                "dtcg_path": dtcg_path,
                "reason": "no Figma name mapping defined",
                "source_file": token["source_file"],
            })
            continue

        if figma_name not in figma_vars:
            # DE-brand tokens are not in the base-dark Figma file by design
            if token["source_file"] in DE_ONLY_SOURCE_FILES:
                report["de_only"].append({
                    "dtcg_path": dtcg_path,
                    "expected_figma_name": figma_name,
                    "$value": str(token["$value"]),
                    "$type": token["$type"],
                    "source_file": token["source_file"],
                    "reason": "DE brand token — base-dark Figma scope only; DE is v2",
                })
            else:
                report["missing_from_figma"].append({
                    "dtcg_path": dtcg_path,
                    "expected_figma_name": figma_name,
                    "$value": str(token["$value"]),
                    "$type": token["$type"],
                    "source_file": token["source_file"],
                })
            continue

        matched_figma_names.add(figma_name)
        figma_var = figma_vars[figma_name]

        match, detail = values_match(token, figma_var)

        if match:
            if "mismatch" not in detail.lower():
                report["matched"].append({
                    "dtcg_path": dtcg_path,
                    "figma_name": figma_name,
                    "detail": detail,
                })
            else:
                # Alias mismatch
                report["alias_mismatches"].append({
                    "dtcg_path": dtcg_path,
                    "figma_name": figma_name,
                    "detail": detail,
                    "source_file": token["source_file"],
                })
        else:
            if "alias" in detail.lower():
                report["alias_mismatches"].append({
                    "dtcg_path": dtcg_path,
                    "figma_name": figma_name,
                    "detail": detail,
                    "source_file": token["source_file"],
                })
            else:
                report["value_mismatches"].append({
                    "dtcg_path": dtcg_path,
                    "figma_name": figma_name,
                    "detail": detail,
                    "dtcg_value": str(token["$value"]),
                    "source_file": token["source_file"],
                })

    # Find Figma orphans (variables not in any DTCG token)
    for figma_name, figma_var in figma_vars.items():
        if figma_name not in matched_figma_names:
            if figma_name in FIGMA_ONLY_EXPECTED:
                report["skipped"].append({
                    "figma_name": figma_name,
                    "reason": "expected Figma-only variable",
                    "collection": figma_var["collection"],
                })
                continue
            report["orphans_in_figma"].append({
                "figma_name": figma_name,
                "collection": figma_var["collection"],
                "resolvedType": figma_var["resolvedType"],
                "is_alias": figma_var["is_alias"],
                "alias_name": figma_var.get("alias_name"),
            })

    # Summary counts
    report["summary"] = {
        "total_dtcg_tokens": len(dtcg_tokens),
        "total_figma_vars": len(figma_vars),
        "matched": len(report["matched"]),
        "missing_from_figma": len(report["missing_from_figma"]),
        "de_only": len(report["de_only"]),
        "orphans_in_figma": len(report["orphans_in_figma"]),
        "value_mismatches": len(report["value_mismatches"]),
        "alias_mismatches": len(report["alias_mismatches"]),
        "skipped": len(report["skipped"]),
        "drift_score": _calculate_drift_score(report),
    }

    return report


def _calculate_drift_score(report: dict) -> float:
    """Calculate a 0-100 drift score (100 = perfectly in sync)."""
    total_comparable = (
        len(report["matched"])
        + len(report["missing_from_figma"])
        + len(report["value_mismatches"])
        + len(report["alias_mismatches"])
    )
    if total_comparable == 0:
        return 100.0
    matched = len(report["matched"])
    return round((matched / total_comparable) * 100, 1)


# ---------------------------------------------------------------------------
# Markdown Report Generator
# ---------------------------------------------------------------------------

def generate_markdown(report: dict) -> str:
    """Generate a human-readable markdown drift report."""
    s = report["summary"]
    lines = []
    lines.append("# Figma ↔ Token JSON Drift Report")
    lines.append("")
    lines.append(f"**Generated:** {report['metadata']['timestamp']}")
    lines.append(f"**Tokens dir:** `{report['metadata']['tokens_dir']}`")
    lines.append(f"**Figma export:** `{report['metadata']['figma_export']}`")
    lines.append("")

    # Scorecard
    score = s["drift_score"]
    emoji = "🟢" if score >= 95 else "🟡" if score >= 80 else "🔴"
    lines.append(f"## Drift Score: {emoji} {score}/100")
    lines.append("")
    lines.append("| Metric | Count |")
    lines.append("|--------|-------|")
    lines.append(f"| DTCG tokens (source of truth) | {s['total_dtcg_tokens']} |")
    lines.append(f"| Figma variables | {s['total_figma_vars']} |")
    lines.append(f"| Matched | {s['matched']} |")
    lines.append(f"| Missing from Figma | {s['missing_from_figma']} |")
    lines.append(f"| DE-only (expected, not scored) | {s['de_only']} |")
    lines.append(f"| Orphans in Figma | {s['orphans_in_figma']} |")
    lines.append(f"| Value mismatches | {s['value_mismatches']} |")
    lines.append(f"| Alias mismatches | {s['alias_mismatches']} |")
    lines.append(f"| Skipped (composite/unmapped) | {s['skipped']} |")
    lines.append("")

    # Value mismatches
    if report["value_mismatches"]:
        lines.append("## Value Mismatches")
        lines.append("")
        lines.append("These tokens exist in both JSON and Figma but have different values.")
        lines.append("")
        lines.append("| Token | Figma Variable | Detail |")
        lines.append("|-------|---------------|--------|")
        for m in report["value_mismatches"]:
            lines.append(f"| `{m['dtcg_path']}` | `{m['figma_name']}` | {m['detail']} |")
        lines.append("")

    # Alias mismatches
    if report["alias_mismatches"]:
        lines.append("## Alias Mismatches")
        lines.append("")
        lines.append("These semantic tokens point to different primitives in JSON vs Figma.")
        lines.append("")
        lines.append("| Token | Figma Variable | Detail |")
        lines.append("|-------|---------------|--------|")
        for m in report["alias_mismatches"]:
            lines.append(f"| `{m['dtcg_path']}` | `{m['figma_name']}` | {m['detail']} |")
        lines.append("")

    # Missing from Figma
    if report["missing_from_figma"]:
        lines.append("## Missing from Figma")
        lines.append("")
        lines.append("These tokens exist in JSON but have no corresponding Figma variable.")
        lines.append("")
        lines.append("| Token | Expected Figma Name | Type | Value |")
        lines.append("|-------|-------------------|------|-------|")
        for m in report["missing_from_figma"]:
            lines.append(f"| `{m['dtcg_path']}` | `{m['expected_figma_name']}` | {m['$type']} | `{m['$value']}` |")
        lines.append("")

    # DE-only tokens (expected, not scored)
    if report["de_only"]:
        lines.append("## DE-Only Tokens (Expected — Not Scored)")
        lines.append("")
        lines.append("These tokens are specific to the Decision Engine brand and are absent")
        lines.append("from the base-dark Figma file by design. DE is a v2 Figma scope.")
        lines.append("")
        lines.append("<details><summary>Show DE-only tokens</summary>")
        lines.append("")
        lines.append("| Token | Expected Figma Name | Value |")
        lines.append("|-------|-------------------|-------|")
        for m in report["de_only"]:
            lines.append(f"| `{m['dtcg_path']}` | `{m['expected_figma_name']}` | `{m['$value']}` |")
        lines.append("")
        lines.append("</details>")
        lines.append("")

    # Orphans in Figma
    if report["orphans_in_figma"]:
        lines.append("## Figma Orphans")
        lines.append("")
        lines.append("These Figma variables have no corresponding token in JSON.")
        lines.append("")
        lines.append("| Figma Variable | Collection | Type | Alias? |")
        lines.append("|---------------|-----------|------|--------|")
        for m in report["orphans_in_figma"]:
            alias_info = f"→ {m['alias_name']}" if m["is_alias"] else "—"
            lines.append(f"| `{m['figma_name']}` | {m['collection']} | {m['resolvedType']} | {alias_info} |")
        lines.append("")

    # Skipped
    if report["skipped"]:
        lines.append("## Skipped")
        lines.append("")
        lines.append("<details><summary>Tokens/variables excluded from comparison</summary>")
        lines.append("")
        for item in report["skipped"]:
            name = item.get("dtcg_path") or item.get("figma_name", "unknown")
            lines.append(f"- `{name}`: {item['reason']}")
        lines.append("")
        lines.append("</details>")
        lines.append("")

    # Matched (collapsible)
    if report["matched"]:
        lines.append("## Matched Tokens")
        lines.append("")
        lines.append(f"<details><summary>{len(report['matched'])} tokens in sync</summary>")
        lines.append("")
        for m in report["matched"]:
            lines.append(f"- `{m['dtcg_path']}` ↔ `{m['figma_name']}`")
        lines.append("")
        lines.append("</details>")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Figma-to-JSON Token Drift Auditor"
    )
    parser.add_argument(
        "--tokens-dir",
        required=True,
        help="Path to the DTCG token JSON directory (e.g. ./tokens)",
    )
    parser.add_argument(
        "--figma-export",
        required=True,
        help="Path to the Figma variable export JSON (from get_variable_defs)",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output directory for reports (default: current dir)",
    )
    args = parser.parse_args()

    output_dir = Path(args.output) if args.output else Path(".")
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"🔍 Reading DTCG tokens from: {args.tokens_dir}")
    print(f"🔍 Reading Figma export from: {args.figma_export}")

    report = run_audit(args.tokens_dir, args.figma_export)

    # Write JSON report
    json_path = output_dir / "drift-report.json"
    with open(json_path, "w") as f:
        json.dump(report, f, indent=2, default=str)
    print(f"📊 JSON report: {json_path}")

    # Write markdown report
    md_path = output_dir / "drift-report.md"
    md_content = generate_markdown(report)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"📝 Markdown report: {md_path}")

    # Print summary
    s = report["summary"]
    score = s["drift_score"]
    status = "IN SYNC ✅" if score >= 95 else "MINOR DRIFT ⚠️" if score >= 80 else "SIGNIFICANT DRIFT ❌"
    print(f"\n{'='*50}")
    print(f"  DRIFT SCORE: {score}/100 — {status}")
    print(f"  Matched: {s['matched']} | Mismatched: {s['value_mismatches']+s['alias_mismatches']} | Missing: {s['missing_from_figma']} | Orphans: {s['orphans_in_figma']} | DE-only: {s['de_only']}")
    print(f"{'='*50}")


if __name__ == "__main__":
    main()
