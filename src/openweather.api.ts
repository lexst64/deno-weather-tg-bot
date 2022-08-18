type Units = 'standart' | 'metric' | 'imperial';

export interface ReverseGeocoding {
	name: string;
	// todo: fix it
	local_names: object;
	lat: number;
	lon: number;
	country: string;
	state?: string;
}

// todo: implement other api feathers
// todo: simplify api usage
export class Openweathermap {
	private static apiUrl = 'http://api.openweathermap.org';
	private apiToken: string;
	private units: Units;

	constructor(apiToken: string, units: Units = 'standart') {
		this.apiToken = apiToken;
		this.units = units;
	}

	async reverseGeocoding(lat: number, lon: number): Promise<ReverseGeocoding[]> {
		const res = await fetch(
			// write fn instead just using template string
			`${Openweathermap.apiUrl}/geo/1.0/reverse?lat=${lat}&lon=${lon}&units=${this.units}&appid=${this.apiToken}`,
		);
		return await res.json();
	}

	// todo: implement returned interface
	async currentWeather(lat: number, lon: number) {
		const res = await fetch(
			`${Openweathermap.apiUrl}/data/2.5/weather?lat=${lat}&lon=${lon}&units=${this.units}&appid=${this.apiToken}`,
		);
		return await res.json();
	}
}
