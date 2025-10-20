// Test script to verify database saving functionality
const testData = {
  fileName: "test_xray_" + Date.now() + ".jpg",
  landmarks: {
    "Nasion": { x: 100, y: 150 },
    "Sella": { x: 120, y: 180 },
    "Porion": { x: 90, y: 200 },
    "Orbitale": { x: 110, y: 190 },
    "A-Point": { x: 130, y: 220 },
    "B-Point": { x: 125, y: 250 },
    "Menton": { x: 120, y: 280 },
    "Corpus Lt.": { x: 140, y: 270 }
  },
  angles: {
    "SNA": 82.5,
    "SNB": 79.3,
    "ANB": 3.2,
    "FMA": 25.4,
    "IMPA": 92.1,
    "FMIA": 62.5
  },
  imageUrl: "https://example.com/test-image.jpg",
  patientName: "Test Patient " + new Date().toLocaleString(),
  patientBirthDate: "1990-01-01"
};

console.log("Sending test data to /api/landmark/save...");
console.log("Test data:", JSON.stringify(testData, null, 2));

fetch("http://localhost:3001/api/landmark/save", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log("Response status:", response.status);
  return response.json();
})
.then(data => {
  console.log("Response data:", JSON.stringify(data, null, 2));
  if (data.success) {
    console.log("✅ SUCCESS: Data saved successfully!");
    console.log("Analysis ID:", data.analysisId);
    console.log("Analysis Code:", data.analysisCode);

    // Now test fetching history
    console.log("\nFetching history to verify...");
    return fetch("http://localhost:3001/api/landmark/history");
  } else {
    console.error("❌ ERROR: Failed to save data");
    console.error("Error details:", data.error);
  }
})
.then(response => response ? response.json() : null)
.then(historyData => {
  if (historyData) {
    console.log("\nHistory response:", JSON.stringify(historyData, null, 2));
    if (historyData.success && historyData.diagnoses && historyData.diagnoses.length > 0) {
      console.log("✅ SUCCESS: History retrieved successfully!");
      console.log("Total analyses found:", historyData.diagnoses.length);
      console.log("Latest analysis:", historyData.diagnoses[0]);
    } else {
      console.log("⚠️ WARNING: No analyses found in history");
    }
  }
})
.catch(error => {
  console.error("❌ ERROR:", error);
});