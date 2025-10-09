import { Injectable } from '@angular/core';

@Injectable()
export class NgxAudioWaveService {
  samples = 50;

  /**
   * Filters the AudioBuffer retrieved from an external source
   * @param {AudioBuffer} audioBuffer the AudioBuffer from drawAudio()
   * @returns {Array} an array of floating point numbers
   */
  filterData(audioBuffer: AudioBuffer): number[] {
    const rawData = audioBuffer.getChannelData(0); // We only need to work with one channel of data
    const blockSize = Math.floor(rawData.length / this.samples); // the number of samples in each subdivision
    const filteredData = [];
    for (let i = 0; i < this.samples; i++) {
      let blockStart = blockSize * i; // the location of the first sample in the block
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum = sum + Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
      }
      filteredData.push(sum / blockSize); // divide the sum by the block size to get the average
    }
    return filteredData;
  }

  /**
   * Normalizes the audio data to make a cleaner illustration
   * @param {Array} filteredData the data from filterData()
   * @returns {Array} an normalized array of floating point numbers
   */
  normalizeData(filteredData: number[]): number[] {
    const multiplier = Math.pow(Math.max(...filteredData), -1);
    return filteredData.map(n => n * multiplier);
  }
}
