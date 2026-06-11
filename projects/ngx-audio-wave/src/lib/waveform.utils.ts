/**
 * Filters the AudioBuffer retrieved from an external source.
 */
export function filterAudioBufferData(
  audioBuffer: AudioBuffer,
  samples: number
): number[] {
  const rawData = audioBuffer.getChannelData(0);
  const sampleCount = Math.max(1, Math.floor(samples));
  const blockSize = Math.max(1, Math.floor(rawData.length / sampleCount));
  const filteredData: number[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const blockStart = blockSize * i;
    let sum = 0;
    let valuesInBlock = 0;

    for (let j = 0; j < blockSize && blockStart + j < rawData.length; j++) {
      sum += Math.abs(rawData[blockStart + j]);
      valuesInBlock++;
    }

    filteredData.push(valuesInBlock > 0 ? sum / valuesInBlock : 0);
  }

  return filteredData;
}

/**
 * Normalizes audio data to the 0..1 range used by the SVG bars.
 */
export function normalizeAudioData(filteredData: number[]): number[] {
  const maxValue = Math.max(...filteredData);
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return filteredData.map(() => 0);
  }

  const multiplier = Math.pow(maxValue, -1);
  return filteredData.map(n => n * multiplier);
}
