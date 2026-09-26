function runAiQuery() {
  const q = document.getElementById('aiQuery').value.trim().toLowerCase();
  const res = document.getElementById('aiResult');
  
  if (!q) {
    res.innerText = "Kripya search karne ke liye kuch text enter karein.";
    res.classList.remove('hidden');
    return;
  }

  res.classList.remove('hidden');
  res.innerText = "AI is querying PostgreSQL database...";

  // Check if productsData has items
  if (!productsData || productsData.length === 0) {
    res.innerText = "AI Analysis: Database me abhi koi items nahi hain. Pehle ek item create karein!";
    return;
  }

  // Filter products matching title or category
  const match = productsData.filter(p => 
    (p.title && p.title.toLowerCase().includes(q)) || 
    (p.category && p.category.toLowerCase().includes(q))
  );

  // Advanced calculation query check
  if (q.includes('valuation') || q.includes('total') || q.includes('sum') || q.includes('price')) {
    const total = match.reduce((sum, p) => sum + Number(p.price || 0), 0);
    res.innerText = `AI Analytical Report: Total valuation of filtered inventory (${match.length} items) is $${total.toLocaleString()}.`;
  } else if (match.length > 0) {
    const titles = match.map(m => m.title).join(', ');
    res.innerText = `AI Query Results: Matched ${match.length} item(s) in database: ${titles}`;
  } else {
    res.innerText = `AI Query Results: Database me "${q}" se matching koi record nahi mila.`;
  }
}