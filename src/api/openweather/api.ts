import { CurrentWeather, Geocoding, MeasurementUnit } from './types.ts';

export class Openweathermap {
  private static API_URL = 'http://api.openweathermap.org';
  private static LOCATION_LIMIT = 5;

  private apiToken: string;
  private units: MeasurementUnit;

  constructor(apiToken: string, units: MeasurementUnit = 'standart') {
    this.apiToken = apiToken;
    this.units = units;
  }

  private processErrorResponse(res: Response) {
    if (res.status === 401) {
      throw 'invalid api token';
    }
    if (res.status === 404) {
      throw 'invalid api path';
    }
    if (res.status === 400) {
      throw 'invalid api parameters';
    }
  }

  private processErrorGeocodingResponse(res: Response): Promise<Geocoding[]> | undefined {
    if (res.status === 400) {
      return new Promise((resolve) => resolve([]));
    }
    this.processErrorResponse(res);
  }

  async reverseGeocoding(lat: number, lon: number): Promise<Geocoding[]> {
    const res = await fetch(
      `${Openweathermap.API_URL}/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=${Openweathermap.LOCATION_LIMIT}&units=${this.units}&appid=${this.apiToken}`,
    );
    if (!res.ok) {
      const promise = this.processErrorGeocodingResponse(res);
      if (promise) return promise;
    }
    return await res.json();
  }

  async geocoding(locationName: string): Promise<Geocoding[]> {
    const res = await fetch(
      `${Openweathermap.API_URL}/geo/1.0/direct?q=${locationName}&limit=${Openweathermap.LOCATION_LIMIT}&appid=${this.apiToken}`,
    );
    if (!res.ok) {
      const promise = this.processErrorGeocodingResponse(res);
      if (promise) return promise;
    }
    return await res.json();
  }

  async currentWeather(lat: number, lon: number): Promise<CurrentWeather> {
    const res = await fetch(
      `${Openweathermap.API_URL}/data/2.5/weather?lat=${lat}&lon=${lon}&units=${this.units}&appid=${this.apiToken}`,
    );
    return await res.json();
  }

  async locationName(lat: number, lon: number): Promise<string> {
    const data: Geocoding[] = await this.reverseGeocoding(lat, lon);
    const { name: city, state, country } = data[0];
    return state ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
  }
}
