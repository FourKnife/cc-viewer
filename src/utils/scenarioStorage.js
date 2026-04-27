import { apiUrl } from './apiUrl';

export async function getScenarios() {
  const res = await fetch(apiUrl('/api/scenarios'));
  const data = await res.json();
  return data.scenarios || [];
}

export async function createScenario(scenario) {
  const res = await fetch(apiUrl('/api/scenarios'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  return res.json();
}

export async function updateScenario(id, scenario) {
  const res = await fetch(apiUrl(`/api/scenarios/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  return res.json();
}

export async function deleteScenario(id) {
  const res = await fetch(apiUrl(`/api/scenarios/${id}`), { method: 'DELETE' });
  return res.json();
}
