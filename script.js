console.log("Script Loaded"); // Check if script loads

// Initialize API connection
const derivSocket = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=65355");

let tickHistory = [];
let tickStreamSubscription = null;
let analysisActive = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM Loaded"); // Check if DOM content is loaded

  const assetSelect = document.getElementById("assetSelect");
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");
  const analysisResults = document.getElementById("analysisResults");

  derivSocket.onopen = () => {
    console.log("WebSocket connection opened");
    fetchAssets();
  };

  derivSocket.onerror = (error) => console.error("WebSocket error:", error);
  derivSocket.onclose = () => console.log("WebSocket connection closed");

  startBtn.addEventListener("click", () => {
    console.log("Start Analysis button clicked");
    startAnalysis();
  });

  stopBtn.addEventListener("click", () => {
    console.log("Stop Analysis button clicked");
    stopAnalysis();
  });

  function fetchAssets() {
    console.log("Fetching assets");
    derivSocket.send(JSON.stringify({ asset_index: 1 }));
  }

  derivSocket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Message received:", data);

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
    console.log("Assets populated");
  }

  function startAnalysis() {
    const selectedAsset = assetSelect.value;
    if (!selectedAsset || analysisActive) return;

    analysisActive = true;
    console.log("Starting analysis for asset:", selectedAsset);
    fetchTickHistory(selectedAsset);
    subscribeToTickStream(selectedAsset);
  }

  function stopAnalysis() {
    analysisActive = false;
    console.log("Stopping analysis");
    if (tickStreamSubscription) derivSocket.send(JSON.stringify({ forget: tickStreamSubscription }));
    analysisResults.innerHTML = "";
  }

  function fetchTickHistory(asset) {
    console.log("Fetching tick history for:", asset);
    derivSocket.send(JSON.stringify({
      ticks_history: asset,
      adjust_start_time: 1,
      count: 1000,
      end: "latest",
      start: 1,
      style: "ticks"
    }));
  }

  function subscribeToTickStream(asset) {
    console.log("Subscribing to tick stream for:", asset);
    derivSocket.send(JSON.stringify({ ticks: asset, subscribe: 1 }));
  }

  function updateTickStream(tickData) {
    console.log("Tick data received:", tickData);
    if (tickHistory.length >= 1000) tickHistory.shift(); // Keep last 1000 ticks
    tickHistory.push(tickData.quote);
    updateAnalysis();
  }

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

  function displayAnalysis(percentages) {
    console.log("Displaying analysis results");
    analysisResults.innerHTML = "<h2>Last Digit Percentages (Last 1000 Ticks)</h2>";
    percentages.forEach((percentage, digit) => {
      analysisResults.innerHTML += `<p>Digit ${digit}: ${percentage.toFixed(2)}%</p>`;
    });
  }
});
