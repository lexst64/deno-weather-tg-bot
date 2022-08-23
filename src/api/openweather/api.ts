import { CurrentWeather, MeasurementUnit, ReverseGeocoding } from './types.ts';

export class Openweathermap {
  private static apiUrl = 'http://api.openweathermap.org';

  private apiToken: string;
  private units: MeasurementUnit;

  constructor(apiToken: string, units: MeasurementUnit = 'standart') {
    this.apiToken = apiToken;
    this.units = units;
  }

  async reverseGeocoding(lat: number, lon: number): Promise<ReverseGeocoding[]> {
    const res = await fetch(
      `${Openweathermap.apiUrl}/geo/1.0/reverse?lat=${lat}&lon=${lon}&units=${this.units}&appid=${this.apiToken}`,
    );
    return await res.json();
  }

  async currentWeather(lat: number, lon: number): Promise<CurrentWeather> {
    const res = await fetch(
      `${Openweathermap.apiUrl}/data/2.5/weather?lat=${lat}&lon=${lon}&units=${this.units}&appid=${this.apiToken}`,
    );
    return await res.json();
  }

  async locationName(lat: number, lon: number): Promise<string> {
    const data: ReverseGeocoding[] = await this.reverseGeocoding(lat, lon);
    const { name: city, state, country } = data[0];
    return state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
  }
}
