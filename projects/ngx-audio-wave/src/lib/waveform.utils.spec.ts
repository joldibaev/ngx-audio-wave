import { filterAudioBufferData, normalizeAudioData } from './waveform.utils';

describe('waveform utils', () => {
  function createAudioBuffer(samples: number[]): AudioBuffer {
    return {
      duration: samples.length,
      getChannelData: () => Float32Array.from(samples),
    } as unknown as AudioBuffer;
  }

  describe('filterAudioBufferData', () => {
    it('returns the requested number of samples', () => {
      const result = filterAudioBufferData(
        createAudioBuffer([0, 0.5, -1, 0.25]),
        2
      );

      expect(result.length).toBe(2);
      expect(result).toEqual([0.25, 0.625]);
    });

    it('handles short audio where samples exceed raw data length', () => {
      const result = filterAudioBufferData(createAudioBuffer([0.5]), 3);

      expect(result).toEqual([0.5, 0, 0]);
    });
  });

  describe('normalizeAudioData', () => {
    it('normalizes values to the largest sample', () => {
      expect(normalizeAudioData([1, 2, 4])).toEqual([0.25, 0.5, 1]);
    });

    it('returns zeroes for silent audio', () => {
      expect(normalizeAudioData([0, 0, 0])).toEqual([0, 0, 0]);
    });

    it('returns an empty array for empty input', () => {
      expect(normalizeAudioData([])).toEqual([]);
    });
  });
});
