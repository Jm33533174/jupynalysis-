const appId = '65355';  // Specified App ID
const token = 'sd6rB58yVyxti8B';  // API token

// WebSocket connection
let socket;
const tickPrices = [];
const digitCounts = Array(10).fill(0);
let evenCount = 0;
let oddCount = 0;

// Define the model
let model;

async function createModel() {
  model = tf.sequential();
  model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [25] }));  // Input layer (25 digits)
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));  // Hidden layer
  model.add(tf.layers.dense({ units: 10, activation: 'softmax' }));  // Output layer (10 possible digits)

  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  console.log("Model created and compiled");
}

// Convert data to tensors and make predictions
async function predictNextDigit() {
  // Prepare the data (last 25 digits from tickPrices)
  const lastDigits = tickPrices.slice(-25);  // Get last 25 digits
  if (lastDigits.length < 25) return '--';  // If not enough data, return placeholder
  
  const inputTensor = tf.tensor2d([lastDigits], [1, 25]);  // Convert to tensor (1x25 matrix)
  
  const prediction = model.predict(inputTensor);
  const predictedIndex = prediction.argMax(-1).dataSync()[0];  // Get the index of the highest probability
  
  return predictedIndex;  // Return the predicted digit
}

document.getElementById("run-analysis").onclick = async () => {
  // Initialize WebSocket and start receiving ticks
  socket = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=' + appId);

  socket.onopen = () => {
    socket.send(JSON.stringify({ authorize: token }));
    socket.send(JSON.stringify({ ticks: "R_50", subscribe: 1 }));
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);

    if (data.msg_type === 'authorize') {
      console.log("Authorized");
    }

    if (data.msg_type === 'tick') {
      const tickPrice = parseFloat(data.tick.quote);
      const lastDigit = tickPrice.toFixed(2).slice(-1);

      // Update the tick data and display
      updateTickData(tickPrice, parseInt(lastDigit));
      updateDisplay(tickPrice, lastDigit);

      // Predict the next digit using the trained model
      predictNextDigit().then(predictedDigit => {
        document.getElementById("predicted-next-digit").textContent = predictedDigit;
      });
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed.");
  };
};

function updateTickData(tickPrice, lastDigit) {
  tickPrices.push(lastDigit);

  if (tickPrices.length > 25) {
    const removedDigit = tickPrices.shift();
    digitCounts[removedDigit]--;
    removedDigit % 2 === 0 ? even
