/**
 * A deterministic 64x64 avatar image, inlined as a data URI.
 *
 * The Image story used to point at https://i.pravatar.cc/96 — a service that
 * returns a DIFFERENT person's photo on every request. The story was therefore
 * never stable, and could never pass an honest visual gate; under the old
 * `maxDiffPixelRatio: 0.02` (~7,700 px on this canvas) an entirely different
 * face counted as "no change". Tightening the tolerance in #235 is what finally
 * surfaced it: consecutive captures of the same page differed by 316-687 px.
 *
 * So the image is inlined. No network in the visual suite, nothing to drift,
 * and the story still tests the thing it is for — that `src` renders and clips
 * to the avatar's circle instead of falling back to initials.
 */
export const SAMPLE_AVATAR_SRC =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAABbUlEQVR42u3avQ1CMQwEYG9AR/lEwTQMw5QUdGzALBRIFBTBP3e2sZ6UGt2XBEhiy3be/noI9uMuz+vP0Q6gCc3DSFV0FENqo8cZ0iF6hCF9ovsY0jC9ySA90+sNAk9/OB0XA24QVPp17ojEDyBFdzA8AHZ0K8MGSItuYmgBkPT3x+1rkAxmgCO6iREFRNKvo+sZJoMBgEofNKwAvJ2D3Ut4gDU9cBGkZPqBiyBV049aBKmaftQiTAf4/nSBgIVhEAB+7MkBvA0SnH7qz6hmEXYA7SixA+zXLlL6PADkQlMPiFwpuYDI733wG7IDcg2wLVS1COajRLddRDyN/h8g30C/kTUF6A2ZAMqrRF9AB0PSy1xfgNKQAKC8Tn8MbEDoeb3QgClwKEtMJACmxKQxMACwIp++zJoW3VxmNRW62dGdhW5rqwEpeqjVwNfsgcqNafaY0G4zoeFpQsvZhKa/IW2XQxpfh7QeD2n+rh0vzB1MEtmaIvoAAAAASUVORK5CYII=';
