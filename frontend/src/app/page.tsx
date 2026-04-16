export default async function Home() {
  const response = await fetch('http://localhost:3001/health', {
    cache: 'no-store',
  });

  const data = await response.json();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Flow Management Platform</h1>
      <p>Backend status: {data.status}</p>
    </main>
  );
}