/**
 * @see https://openweathermap.org/current#data
 */
export type MeasurementUnit = 'standart' | 'metric' | 'imperial';

/**
 * @see https://openweathermap.org/api/geocoding-api#reverse
 */
export interface Geocoding {
  name: string;
  local_names: Map<string, string>;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

export interface Weather {
  id: number;
  main: string;
  description: string;
  icon: string;
}

/**
 * @see https://openweathermap.org/current#current_JSON
 */
export interface CurrentWeather {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Weather[];
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type: number;
    id: number;
    message: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}
