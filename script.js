//Gets the weather data from the Open Meteo API for the next seven days by default
const average_temperatures = {}; //global variable for average temperatures
const average_temperatures_feelslike = {}; //global variable for average feelslike temperatures
const cityColors = {
  Amsterdam: "hsl(0, 70%, 50%)", // Red
  Athens: "hsl(200, 70%, 50%)", // Yellow
  Barcelona: "hsl(300, 70%, 50%)", // Magenta
  Berlin: "hsl(120, 70%, 50%)", // Green
  Dubai: "hsl(180, 70%, 50%)", // Cyan
  Dublin: "hsl(240, 70%, 50%)", // Blue
  Lisbon: "hsl(30, 70%, 50%)", // Orange
  London: "hsl(270, 70%, 50%)", // Purple
  Madrid: "hsl(100, 70%, 50%)", // Lime
  "New York": "hsl(210, 70%, 50%)", // Sky Blue
  Paris: "hsl(270, 50%, 75%)", //Lavender
  Prague: "hsl(180, 50%, 50%)", //Teal
  Rome: "hsl(120, 50%, 25%)", //Olive
  Venice: "hsl(350, 70%, 25%)" //Rose
};

let myChart; //global variable for the chart
let homeCity; //global variable for the home city

async function fetchCityWeatherData(city) {
  try {
    // Get coordinates for the city
    const geocodingParams = new URLSearchParams({
      name: city,
      count: "1",
      language: "en",
      format: "json"
    });
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?${geocodingParams}`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.results || geocodingData.results.length === 0) {
      throw new Error("City not found");
    }

    const { latitude, longitude } = geocodingData.results[0];

    const baseUrl = "https://api.open-meteo.com/v1/forecast";
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      hourly: "temperature_2m,apparent_temperature,precipitation,weather_code", // Request specific data
      timezone: "auto" // Automatically adjust to local timezone
    });
    const response = await fetch(`${baseUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }
}

function createDayData(data, start_index, end_index) {
  return {
    time: data.hourly.time.slice(start_index, end_index),
    temperature: data.hourly.temperature_2m.slice(start_index, end_index),
    temperature_feelslike: data.hourly.apparent_temperature.slice(
      start_index,
      end_index
    )
  };
}

// // Averages the data into days
function calculateAverage(arr) {
  const arr2 = arr.map((val) => parseFloat(val));

  const sum = arr2.reduce((acc, val) => acc + val, 0);
  return sum / arr2.length;
}

function createDayfromDate(dateString) {
  const date = new Date(dateString);

  // Get day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayIndex = date.getDay();

  // Map the day index to a weekday name
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = daysOfWeek[dayIndex];

  // console.log(dayName); // Output: Monday
  return dayName;
}

console.log("The day for this date is:", createDayfromDate("2025-02-10"));

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0"); // Ensures two digits
  const month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are 0-based
  const formattedDate = `${day}-${month}`;
  return [createDayfromDate(dateString), formattedDate];
}

//The data provided by API in 24hrs per day.
//This creates the daily data.
function createDailydata(data, cityName) {
  const numDays = 7;
  const hoursPerDay = 24;
  const dailyData = {
    day: [],
    temperature: [],
    temperature_feelslike: []
  };

  for (let i = 0; i < numDays; i++) {
    const startIndex = i * hoursPerDay;
    const endIndex = startIndex + hoursPerDay;
    const dayData = createDayData(data, startIndex, endIndex);

    dailyData.day.push(dayData.time[0].split("T")[0]);
    dailyData.temperature.push(
      calculateAverage(dayData.temperature).toFixed(1)
    );
    dailyData.temperature_feelslike.push(
      calculateAverage(dayData.temperature_feelslike).toFixed(1)
    );
  }

  return dailyData;
}

function addDataToGraph(data, cityName) {
  const dailyData = createDailydata(data, cityName);

  // console.log("Data Daily equals: ", calculateAverage(dailyData.temperature));
  // console.log("Data Daily temperature: ", dailyData.temperature);
  // console.log("Length:", dailyData.temperature.length);
  // console.log("Sample values:", dailyData.temperature.slice(0, 5));

  //parseFloat converts back to as toFixed outputs a string
  average_temperatures[cityName] = parseFloat(
    calculateAverage(dailyData.temperature).toFixed(1)
  );
  average_temperatures_feelslike[cityName] = parseFloat(
    calculateAverage(dailyData.temperature_feelslike).toFixed(1)
  );

  //ADDS DATA TO THE CHART OR CREATES THE CHART IF NON-EXISTENT

  //Case 1: Chart exists, call addDatasetToChart func to add extra data
  if (myChart) {
    // Update existing chart

    addDatasetToChart(myChart, dailyData, cityName);
  } else {
    //Case 2: Create new chart

    // const ctx = document.getElementById("myChart");
    const ctx = document.createElement("canvas");
    ctx.id = "myChart";
    document.getElementById("chart-container").appendChild(ctx);

    // let color = getRandomColor(); //0702 LJ
    let color = createCityColor(cityName);

    //Creates a new line chart picking up data from dataDaily
    //dates are formatted and added to the labels on x-axis
    //temperature is added as a solid line
    //feels-like temperature is added as a dashed line

    myChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: dailyData.day.map(formatDate),
        datasets: [
          {
            label: `${cityName}`,
            data: dailyData.temperature,
            borderWidth: 3,
            borderColor: color,

            tension: 0.1
          },
          {
            label: `${cityName} Feels Like`,
            data: dailyData.temperature_feelslike,
            borderWidth: 3,
            borderColor: color,
            borderDash: [5, 5],
            borderDashLegend: [5, 5],
            tension: 0.1,
            fill: false
          }
        ]
      },
      options: {
        // aspectRatio: 3.5,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: "Temperatures(°C) in the next Seven Days",
            font: {
              size: 16
            }
          },
          legend: {
            display: true,
            labels: {
              usePointStyle: true,
              pointStyle: "line",
              position: "right",
              align: "center",
              // Custom legend line drawing to show dashed line
              generateLabels: (chart) => {
                const originalLabels = Chart.defaults.plugins.legend.labels.generateLabels(
                  chart
                );
                return originalLabels.map((label) => {
                  const dataset = chart.data.datasets[label.datasetIndex];
                  if (dataset.borderDash) {
                    label.lineDash = dataset.borderDash;
                  }
                  return label;
                });
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: false
          }
        }
      }
    });
  }
}

function createCityColor(cityName) {
  return cityColors[cityName];
}

function addDatasetToChart(chart, data, cityName) {
  let color = createCityColor(cityName); //getRandomColor();//0702 LJ
  chart.data.datasets.push({
    label: `${cityName}`,
    data: data.temperature,
    borderWidth: 3,
    borderColor: color,
    tension: 0.1
  });

  chart.data.datasets.push({
    label: `${cityName} Feels Like`,
    data: data.temperature_feelslike,
    borderWidth: 3,
    borderColor: color,
    borderDash: [5, 5], // Add a dashed line to differentiate
    tension: 0.1
  });

  chart.update();
}
///////////////////////////////
//ADD EVENT LISTENERS TO BOTH INPUT BOXES
//EX 1
const cityInputs = document.querySelectorAll("#home-city-input, #city-input");

cityInputs.forEach((input) => {
  input.addEventListener("input", function (event) {
    //if they delete the repeated city, error goes away
    if (event.target.value === "") {
      document.getElementById("city-error").textContent = "";
    }
    const cityDatalist = document.getElementById("city-datalist");

    //EX 2 -ERROR CHECKING FOR IF CITY EXISTS
    //2a checks for existing cities in the HTML and adds them to an array

    //*
    const existingCities = Array.from(
      document.getElementById("user-destinations").children
    ).map((listItem) => listItem.getAttribute("data-city"));

    //2b displays error message.
    //*
    if (existingCities.includes(event.target.value)) {
      document.getElementById("city-error").textContent =
        "City already exists.  Please try again!";

      //2c Find the corresponding list item and make it flash
      const listItems = document.getElementById("user-destinations").children;
      Array.from(listItems).forEach((listItem) => {
        if (listItem.getAttribute("data-city") === event.target.value) {
          // Add the flashing class
          listItem.classList.add("flash-error"); //2d it adds the class to the DOM

          //2e Remove the flashing class after 3 seconds
          setTimeout(() => {
            listItem.classList.remove("flash-error"); //removes the class from the DOM
          }, 3000);
        }
      });

      return; // Exit the function
    }

    ////
    //-creates an array of the cities in the datalist ['London', 'Berlin', .....]
    const options = Array.from(cityDatalist.options).map((opt) => opt.value);

    //If the value from the input box is included in the array options execute the code
    //to assign the home city
    if (options.includes(event.target.value)) {
      // console.log("Autocomplete option selected:", event.target.value);

      //Handles the selection of a valid city in either input box
      if (event.target.id === "home-city-input") {
        homeCity = event.target.value;
      }

      //The error is cleared when the user inputs a valid city
      document.getElementById("city-error").textContent = ""; //LJ 0702

      //NO ERRORS
      //Ex3  Dynamically creating the user-destination list items
      //Already created an empty list in the HTML to contain this
      const listItem = document.createElement("li");
      listItem.textContent = event.target.value;

      document.getElementById("user-destinations").appendChild(listItem);

      const city = event.target.value;

      listItem.setAttribute("data-city", city); //adding the city as an attribute to the list item, so we can use it later.
      // console.log("the current value of city is: ", city);

      const cityInput = city;

      //EX 4 -fetches the weather data for cityInpu and parses it to the addDatatoGraph function
      fetchCityWeatherData(cityInput)
        .then((data) => {
          console.log("cityWeatherData: ", data);
          console.log("cityInput: ", cityInput);
          addDataToGraph(data, cityInput);
        })
        .catch((error) => {
          console.error("Error:", error);
        });

      document.getElementById("city-input").value = ""; //resets the city-input box to blank

      //Ex 5 -each list item gets a remove button that is an 'x'
      const removeButton = document.createElement("button");
      removeButton.textContent = "x";
      removeButton.className = "remove-item";
      listItem.appendChild(removeButton);

      //Ex 6 -Remove the city and data from the graph
      //0702 LJ
      removeButton.onclick = function () {
        listItem.remove(); //removes the list item

        const cityToRemove = listItem.getAttribute("data-city");

        if (cityToRemove === homeCity) {
          homeCity = null;
          // home - cit;
        }

        //deletes the city from the average and feels like temperature objects
        delete average_temperatures[cityToRemove];
        delete average_temperatures_feelslike[cityToRemove];
        removeChartData(myChart, cityToRemove);
      };
    }
  });
});

///////////////////////////////
//0702 LJ

//Ex 7 -Remove the city and data from the graph
function removeChartData(chart, cityName) {
  chart.data.datasets = chart.data.datasets.filter(
    (dataset) => !dataset.label.startsWith(cityName)
  );
  // chart.update();

  //If no city info - datasets is empty then destroy the chart
  if (chart.data.datasets.length === 0) {
    chart.destroy();
    myChart = null;
    // recommendations = null;
    document.getElementById("myChart").remove();
    document.getElementById("recommendations")?.remove(); //? is a shortcut saying if the thing you just fetched is null or undefined, give up and dont' do the rest.
  } else {
    //otherwise update with the city removed
    chart.update();
  }
}

//CREATING THE RECOMMENDATIONS

//Ex 8 -CREATING THE RECOMMENDATIONS
const createButton = document.getElementById("createButton");

createButton.addEventListener("click", function () {
  //CASE WHERE INPUTS BLANK
  // Get the values of the input boxes
  const cityInput = document.getElementById("city-input").value.trim();
  // const homeCityInput = document.getElementById("home-city-input").value.trim();
  const destinations = Object.keys(average_temperatures).filter(
    (x) => x !== homeCity
  );
  console.log("Destinations:", destinations);

  let recommendations = document.getElementById("recommendations");

  if (!recommendations) {
    recommendations = document.createElement("div");
    recommendations.id = "recommendations";
    recommendations.className = "recommendations";
    document
      .getElementById("recommendations-container")
      .appendChild(recommendations);
  }

  // Check if home city or desination cities are blank and display errors in the recommendations box

  if (destinations.length === 0 && !homeCity) {
    recommendations.textContent =
      "No cities have been entered. Please enter a home and destination cities.";
    return; // Stop further execution
  }

  // if (!homeCity && destinations.length > 0)
  if (!homeCity) {
    recommendations.textContent =
      "No home city has been entered. Please enter a home city.";
    return; // Stop further execution
  }

  // if (homeCity && destinations.length === 0)
  if (destinations.length === 0) {
    recommendations.textContent =
      "No destination cities have been entered. Please enter destinations.";
    return; // Stop further execution
  }

  //CASE WHERE INPUTS NOT BLANK
  //8b.

  let warmerCities = {};
  console.log("average temperatures array", average_temperatures);
  for (const [city, average_temp] of Object.entries(average_temperatures)) {
    if (average_temp > average_temperatures[homeCity]) {
      warmerCities[city] = average_temp;
    }
  }

  let warmerCitiesfeelslike = {};
  for (const [city, average_temp_fl] of Object.entries(
    average_temperatures_feelslike
  )) {
    if (average_temp_fl > average_temperatures_feelslike[homeCity]) {
      warmerCitiesfeelslike[city] = average_temp_fl;
    }
  }

  console.log("WARMER CITIES", warmerCities);
  let formattedCitiesfeelslike = "";
  if (Object.keys(warmerCitiesfeelslike).length > 0) {
    // Format the warmer cities as "City (Temperature)"
    formattedCitiesfeelslike = Object.entries(warmerCitiesfeelslike)
      .map(([city, temp]) => `${city} (${temp}°C)`)
      .join(", ");
  }

  if (Object.keys(warmerCities).length > 0) {
    // Format the warmer cities as "City (Temperature)"
    const formattedCities = Object.entries(warmerCities)
      .map(([city, temp]) => `${city} (${temp}°C)`)
      .join(", ");
    // , with a feels like temperature of  ${average_temperatures_feelslike[homeCity]}°C.
    recommendations.innerHTML = `The average temperature in your home city, ${homeCity} is: ${average_temperatures[homeCity]}°C (Feels like: ${average_temperatures_feelslike[homeCity]}°C). <br> <br> Cities, on average, warmer than ${homeCity}: ${formattedCities}
    <br><br>Plus those, on average, that feel warmer than ${homeCity}: ${formattedCitiesfeelslike}`;
  } else {
    // && average_temperatures.length === 0
    // if (!homeCity || homeCity.trim() === "") {
    //   recommendations.textContent = `No cities selected.`;
    // }
    recommendations.textContent = `No cities, on average, are warmer than your home city, ${homeCity}.`;
  }
});