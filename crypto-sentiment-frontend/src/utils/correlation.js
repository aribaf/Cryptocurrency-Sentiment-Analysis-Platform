export function calculateCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / x.length;
  const meanY = y.reduce((a, b) => a + b, 0) / y.length;

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < x.length; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    denX += Math.pow(x[i] - meanX, 2);
    denY += Math.pow(y[i] - meanY, 2);
  }

  return denX && denY ? num / Math.sqrt(denX * denY) : 0;
}
