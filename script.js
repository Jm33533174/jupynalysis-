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
  model.add(tf.layers.dense({ units: 64, activation: 'relu', inputShape: [10] }));  // Input layer (10 digits)
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
  // Prepare the data (last 10 digits from tickPrices)
  const lastDigits = tickPrices.slice(-10);  // Get last 10 digits
  if (lastDigits.length < 10) return '--';  // If not enough data, return placeholder
  
  const inputTensor = tf.tensor2d([lastDigits], [1, 10]);  // Convert to tensor (1x10 matrix)
  
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
    removedDigit % 2 === 0 ? evenCount-- : oddCount--;
  }

  digitCounts[lastDigit]++;
  lastDigit % 2 === 0 ? evenCount++ : oddCount++;

  updateDigitPercentages();
  updateEvenOddPercentages();
}

function updateDigitPercentages() {
  const totalTicks = tickPrices.length;
  const tbody = document.querySelector("#digit-percentage-table tbody");
  tbody.innerHTML = "";

  digitCounts.forEach((count, digit) => {
    const percentage = ((count / totalTicks) * 100).toFixed(2);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${digit}</td>
      <td>${percentage}%</td>
    `;
    tbody.appendChild(row);
  });
}

function updateEvenOddPercentages() {
  const totalTicks = tickPrices.length;
  const evenPercentage = ((evenCount / totalTicks) * 100).toFixed(2);
  const oddPercentage = ((oddCount / totalTicks) * 100).toFixed(2);

  document.getElementById("even-percentage").textContent = `${evenPercentage}%`;
  document.getElementById("odd-percentage").textContent = `${oddPercentage}%`;
}

function updateDisplay(tickPrice, lastDigit) {
  const tickCount = tickPrices.length;
  document.getElementById("tick-price").textContent = tickPrice.toFixed(2);
  document.getElementById("last-digit").textContent = lastDigit;
  document.getElementById("tick-count").textContent = tickCount;
}

// Train the model with mock data or historical data
async function trainModel() {
  const mockData = [
    // Example: each input is a sequence of the last 10 digits, and the output is the next digit
    { input: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], output: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
    { input: [2, 3, 4, 5, 6, 7, 8, 9, 0, 1], output: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0] },
    { input: [3, 4, 5, 6, 7, 8, 9, 0, 1, 2], output: [0, 0, 0, 0, 0, 0, 0, 1, 0, 0] },
    // Add more data as needed
  ];

  const inputs = mockData.map(item => item.input);
  const outputs = mockData.map(item => item.output);

  const inputTensor = tf.tensor2d(inputs);
  const outputTensor = tf.tensor2d(outputs);

  await model.fit(inputTensor, outputTensor, {
    epochs: 50
  });

  console.log("Model trained");
}

// Create and train the model
createModel().then(() => {
  trainModel();
});
