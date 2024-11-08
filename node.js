// Initialize API connection
const derivSocket = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=65355");

let tickHistory = [];
let tickStreamSubscription = null;
let analysisActive = false;

document.addEventListener("DOMContentLoaded", () => {
  const assetSelect = document.getElementById("assetSelect");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const analysisResults = document.getElementById("analysisResults");

  // Fetch asset list
  derivSocket.onopen = () => fetchAssets();

  startBtn.addEventListener("click", startAnalysis);
  stopBtn.addEventListener("click", stopAnalysis);

  // Function to fetch assets
  function fetchAssets() {
    derivSocket.send(JSON.stringify({ asset_index: 1 }));
  }

  derivSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.msg_type === "asset_index") {
      populateAssetOptions(data.asset_index);
    } else if (data.msg_type === "history") {
      tickHistory = data.history.prices;
      updateAnalysis();
    } else if (data.msg_type === "tick") {
      updateTickStream(data.tick);
    }
  };

  function populateAssetOptions(assets) {
    assetSelect.innerHTML = "";
    assets.forEach(asset => {
      const option = document.createElement("option");
      option.value = asset.symbol;
      option.textContent = asset.display_name;
      assetSelect.appendChild(option);
    });
  }

  // Start Analysis
  function startAnalysis() {
    const selectedAsset = assetSelect.value;
    if (!selectedAsset || analysisActive) return;

    analysisActive = true;
    fetchTickHistory(selectedAsset);
    subscribeToTickStream(selectedAsset);
  }

  // Stop Analysis
  function stopAnalysis() {
    analysisActive = false;
    if (tickStreamSubscription) derivSocket.send(JSON.stringify({ forget: tickStreamSubscription }));
    analysisResults.innerHTML = "";
  }

  // Fetch last 1000 ticks for selected asset
  function fetchTickHistory(asset) {
    derivSocket.send(JSON.stringify({
      ticks_history: asset,
      adjust_start_time: 1,
      count: 1000,
      end: "latest",
      start: 1,
      style: "ticks"
    }));
  }

  // Subscribe to tick stream for real-time updates
  function subscribeToTickStream(asset) {
    derivSocket.send(JSON.stringify({ ticks: asset, subscribe: 1 }));
  }

  // Update tick stream with new tick data
  function updateTickStream(tickData) {
    if (tickHistory.length >= 1000) tickHistory.shift(); // Keep last 1000 ticks
    tickHistory.push(tickData.quote);
    updateAnalysis();
  }

  // Analysis: Calculate last digit occurrence percentages
  function updateAnalysis() {
    if (!analysisActive) return;
    const lastDigitsCount = Array(10).fill(0);
    tickHistory.forEach(price => {
      const lastDigit = parseInt(price.toString().slice(-1));
      lastDigitsCount[lastDigit]++;
    });

    const lastDigitPercentages = lastDigitsCount.map(count => (count / tickHistory.length) * 100);
    displayAnalysis(lastDigitPercentages);
  }

  // Display analysis results
  function displayAnalysis(percentages) {
    analysisResults.innerHTML = "<h2>Last Digit Percentages (Last 1000 Ticks)</h2>";
    percentages.forEach((percentage, digit) => {
      analysisResults.innerHTML += `<p>Digit ${digit}: ${percentage.toFixed(2)}%</p>`;
    });
  }
});
