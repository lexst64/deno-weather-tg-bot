import 'https://deno.land/std@0.152.0/dotenv/load.ts';

export class TimezoneDB {
  private static API_URL = 'https://api.timezonedb.com';
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  async localTime(lat: number, lon: number): Promise<any> {
    const res = await fetch(
      `${TimezoneDB.API_URL}/v2.1/get-time-zone?key=${this.apiToken}&format=json&by=position&lat=${lat}&lng=${lon}`,
    );
    if (res.ok) {
      const data = await res.json();
      console.log(data);
      if (data.status === 'OK') {
        return data;
      }
      throw data.message;
    }
    throw res.statusText;
  }
}

// console.log(await new TimezoneDB(Deno.env.get('TIMEZONEDB_TOKEN') || '').localTime(40.689247, 74.044502));
