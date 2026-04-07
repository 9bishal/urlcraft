import http from 'k6/http';

export let options = {
  vus: 1000,        // virtual users
  duration: '30s',
};

export default function () {
  http.post('http://localhost:3000/shorten', JSON.stringify({
    url: "https://google.com"
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}