import 'https://deno.land/std@0.152.0/dotenv/load.ts';

export class TimeApi {
  private static API_URL = 'https://timeapi.io/api';

  async currentTime(lat: number, lon: number): Promise<any> {
    const res = await fetch(
      `${TimeApi.API_URL}/Time/current/coordinate?latitude=${lat}&longitude=${lon}`,
    );
    if (res.ok) {
      return await res.json();
    }
    throw 'error occured';
  }
}
