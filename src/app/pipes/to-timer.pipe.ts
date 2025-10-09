import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'toTimer',
})
export class ToTimerPipe implements PipeTransform {
  transform(value: number) {
    const from = 14;
    return new Date(value * 1000).toISOString().substring(from, from + 5);
  }
}
