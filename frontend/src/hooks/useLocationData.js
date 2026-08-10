import { useQuery } from 'react-query';

export function useCountries() {
  return useQuery({
    queryKey: ['countries'],
    queryFn: async () => {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/positions');
      const json = await res.json();
      return json.data.map(c => c.name).sort();
    },
    staleTime: Infinity,
  });
}

export function useStates(country) {
  return useQuery({
    queryKey: ['states', country],
    queryFn: async () => {
      if (!country) return [];
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country })
      });
      const json = await res.json();
      if (!json || json.error) return [];
      return json.data.states.map(s => s.name).sort();
    },
    enabled: !!country,
    staleTime: Infinity,
  });
}

export function useCities(country, state) {
  return useQuery({
    queryKey: ['cities', country, state],
    queryFn: async () => {
      if (!country || !state) return [];
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, state })
      });
      const json = await res.json();
      if (!json || json.error) return [];
      return json.data.sort();
    },
    enabled: !!country && !!state,
    staleTime: Infinity,
  });
}
