import 'https://deno.land/std@0.152.0/dotenv/load.ts';
import { CurrentDateTime } from './types.ts';

export class TimeApi {
  private static API_URL = 'https://timeapi.io/api';

  /**
   * Doesn't require an api token
   */
  constructor() {}

  /**
   * Determines the current date and time of a timezone by geocoordinates
   *
   * @param lat - latitude
   * @param lon - longitude
   * @returns `CurrentTime` object if location has been determined by provided
   * lat and lon
   * @throws Error if date and time info hasn't been found for provided location
   */
  async currentTime(lat: number, lon: number): Promise<CurrentDateTime> {
    const res = await fetch(
      `${TimeApi.API_URL}/Time/current/coordinate?latitude=${lat}&longitude=${lon}`,
    );
    if (res.ok) {
      return await res.json();
    }
    throw 'failed to determine current time by coordinates';
  }
}
