import { nasa_api_key } from './API_KEY';
const BASE_URL = "https://api.nasa.gov";
const API_KEY = nasa_api_key;
export async function fetchArticles(page = 1, pageSize = 20) {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(
    Date.now() - pageSize * page * 24 * 60 * 60 * 1000
  ).toISOString().split("T")[0];

  const res = await fetch(
    `${BASE_URL}/planetary/apod?start_date=${startDate}&end_date=${endDate}&api_key=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to fetch articles");

  let data = await res.json();
  data = data.sort((a, b) => new Date(b.date) - new Date(a.date));

  const unique = Array.from(new Map(data.map(item => [item.date, item])).values());

  const startIndex = (page - 1) * pageSize;
  const endIndex = page * pageSize;
  return unique.slice(startIndex, endIndex);
}

export async function searchArticles(query) {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const res = await fetch(
    `${BASE_URL}/planetary/apod?start_date=${startDate}&end_date=${endDate}&api_key=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to search articles");

  const data = await res.json();
  return data.filter(
    item =>
      item.title?.toLowerCase().includes(query.toLowerCase()) ||
      item.explanation?.toLowerCase().includes(query.toLowerCase())
  );
}
