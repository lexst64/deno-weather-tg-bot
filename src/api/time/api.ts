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
   * @returns `CurrentDateTime` current date and time have been determined for
   * provided geocoordinates
   * @throws Error if date and time info hasn't been found for provided
   * geocoordinates
   */
  async currentTimeByCoords(lat: number, lon: number): Promise<CurrentDateTime> {
    const res = await fetch(
      `${TimeApi.API_URL}/Time/current/coordinate?latitude=${lat}&longitude=${lon}`,
    );
    if (res.ok) {
      return await res.json();
    }
    throw 'failed to determine current date and time by coordinates';
  }

  /**
   * Determines the current date and time of a timezone by full IANA time zone name
   *
   * @param timeZone - full IANA time zone name
   * @returns `CurrentDateTime` current date and time have been determined for
   * provided time zone name
   * @throws Error if current date and time info hasn't been found for provided
   * time zone name
   */
  async currentTimeByTimeZone(timeZone: string): Promise<CurrentDateTime> {
    const res = await fetch(
      `${TimeApi.API_URL}/Time/current/zone?timeZone=${timeZone}`,
    );
    if (res.ok) {
      return await res.json();
    }
    throw 'failed to determine current date and time by time zone';
  }
}
