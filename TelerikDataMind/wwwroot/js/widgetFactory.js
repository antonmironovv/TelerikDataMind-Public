function renderWidgets(widgets, data) {
    $("#widgets").empty();
    console.log(data);
    if (data && data.length && data[0]["Image URL"]) {
        const uniqueImages = [...new Set(data.map(d => d["Image URL"]))].slice(0, 4);
        const imgContainer = $("<div class='dashboard-image-cards'></div>");
        uniqueImages.forEach(url => {
            imgContainer.append(
                $("<div class='k-card k-p-2 k-shadow-sm k-rounded-xl'></div>").append(
                    $("<img>").attr("src", url).attr("alt", "Red Panda").css({
                        width: "220px",
                        height: "180px",
                        "object-fit": "cover",
                        "border-radius": "12px"
                    })
                )
            );
        });
        $("#widgets").append(imgContainer);
    }

    widgets.forEach(w => {
        const type = typeof w === "string" ? w : w.type;
        const settings = w.settings || {};
        const title = w.title || settings.title || w.name || type;
        const container = $(`<div class='widget-box k-card k-p-4 k-mb-4' id='${w.name}'></div>`);

        if (title) {
            container.append(`<h3 class='k-text-center k-mb-3'>${title}</h3>`);
        }

        const chartContainer = $("<div class='chart-container'></div>");
        container.append(chartContainer);
        $("#widgets").append(container);

        switch (type) {
            case "Grid": renderGrid(chartContainer, data, settings); break;
            case "Chart": renderChart(chartContainer, data, settings); break;
            case "LineChart": renderLineChart(chartContainer, data, settings); break;
            case "PieChart": renderPieChart(chartContainer, data, settings); break;
            case "DonutChart": renderDonutChart(chartContainer, data, settings); break;
            case "Map": renderMap(chartContainer, data, settings); break;
            case "StockChart": renderStockChart(chartContainer, data, settings); break;
            case "Scheduler": renderScheduler(chartContainer, data, settings); break;
            case "AreaChart": renderAreaChart(chartContainer, data, settings); break;
            case "BarChart": renderBarChart(chartContainer, data, settings); break;
            default: chartContainer.append(`<p>Unknown widget: ${type}</p>`);
        }
    });
}


function renderGrid(container, data, settings) {
    const columns = settings.columns && settings.columns.length
        ? settings.columns.map(col =>
            typeof col === "string" ? { field: col, title: col } : col
        )
        : Object.keys(data[0])
            .slice(0, 5)
            .map(k => ({ field: k, title: k }));

    container.kendoGrid({
        dataSource: { data, pageSize: 10 },
        toolbar: ["excel", "pdf", "search"],
        height: settings.height || 350,
        sortable: settings.sortable !== false,
        filterable: settings.filterable !== false,
        resizable: true,
        reorderable: true,
        groupable: true,
        pageable: { refresh: true, pageSizes: [5, 10, 20] },
        columns: columns
    });
}


function renderChart(container, data, settings) {
    const categoryField = settings.categoryField || Object.keys(data[0])[0];
    const valueField = settings.valueField || Object.keys(data[0])[1];
    if (data.length > 1000) data = data.slice(0, 1000);
    const labelStep = data.length > 200 ? Math.ceil(data.length / 50) : 1;

    const colorPalette = ["#9B38D4", "#0AD69F", "#EF466F", "#FFD166", "#26547C", "#212529"];
    const color = settings.color || colorPalette[Math.floor(Math.random() * colorPalette.length)];

    container.kendoChart({
        dataSource: { data },
        seriesDefaults: {
            labels: { visible: false },
            markers: { visible: data.length <= 200 }
        },
        series: [{
            type: settings.type || "column",
            field: valueField,
            categoryField: categoryField,
            color: color
        }],
        categoryAxis: { labels: { rotation: -30, step: labelStep } },
        valueAxis: { line: { visible: false } },
        legend: { position: "bottom" },
        tooltip: { visible: true, template: "#= category #: #= kendo.toString(value, 'n2') #" }
    });
}

function renderLineChart(container, data, settings) {
    if (!data || !data.length) return;

    const keys = Object.keys(data[0]);
    let categoryField = settings.categoryField || keys.find(k => typeof data[0][k] === "string");
    let valueField = settings.valueField || keys.find(k => typeof data[0][k] === "number");

    if (!categoryField || categoryField === valueField) {
        categoryField = keys.find(k => isNaN(data[0][k])) || keys[0];
        valueField = keys.find(k => typeof data[0][k] === "number") || keys[1];
    }

    const isDateLike = typeof data[0][categoryField] === "number" && data.some(d => d[categoryField] > 40000 && d[categoryField] < 50000);
    if (isDateLike) categoryField = keys.find(k => typeof data[0][k] === "string");

    let parsedData = data;
    if (parsedData.length > 500) {
        const step = Math.ceil(parsedData.length / 500);
        parsedData = parsedData.filter((_, i) => i % step === 0);
    }

    const step = Math.ceil(parsedData.length / 20);
    const colorPalette = ["#9B38D4", "#0AD69F", "#EF466F", "#FFD166", "#26547C", "#212529"];

    container.kendoChart({
        dataSource: { data: parsedData, sort: { field: categoryField, dir: "asc" } },
        seriesDefaults: { type: "line", markers: { visible: parsedData.length <= 200 }, style: "smooth" },
        series: [{
            field: valueField,
            categoryField: categoryField,
            name: valueField,
            color: colorPalette[Math.floor(Math.random() * colorPalette.length)]
        }],
        legend: { position: "bottom" },
        categoryAxis: { majorGridLines: { visible: false }, labels: { rotation: -30, step } },
        valueAxis: { line: { visible: false } },
        transitions: true,
        tooltip: { visible: true, template: "#= series.name #: #= kendo.toString(value, 'n2') #" }
    });
}


function renderPieChart(container, data, settings) {
    const categoryField = settings.categoryField;
    const valueField = settings.valueField;

    if (data[0] && data[0].start && data[0].end && !data[0][valueField]) {
        data = data.map(d => {
            const start = new Date(d.start);
            const end = new Date(d.end);
            const duration = (end - start) / 3600000;
            return Object.assign({}, d, { [valueField]: duration });
        });
    }

    const grouped = {};
    data.forEach(item => {
        const cat = item[categoryField];
        grouped[cat] = (grouped[cat] || 0) + (item[valueField] || 0);
    });

    let chartData = Object.entries(grouped).map(([category, value]) => ({ category, value }));
    chartData.sort((a, b) => b.value - a.value);

    if (chartData.length > 10) {
        const top = chartData.slice(0, 9);
        const otherSum = chartData.slice(9).reduce((sum, d) => sum + d.value, 0);
        top.push({ category: "Other", value: otherSum });
        chartData = top;
    }

    const colorPalette = ["#9B38D4", "#0AD69F", "#EF466F", "#FFD166", "#26547C", "#212529"];
    chartData = chartData.map((d, i) => ({
        category: d.category,
        value: d.value,
        color: colorPalette[i % colorPalette.length]
    }));

    container.kendoChart({
        legend: { visible: true, position: "top" },
        seriesDefaults: {
            labels: {
                visible: true,
                position: "outsideEnd",
                align: settings.align || "circle",
                background: "transparent",
                template: "#= category # - #= kendo.format('{0:P1}', percentage)#"
            },
            overlay: { gradient: "none" }
        },
        series: [{
            type: "pie",
            categoryField: "category",
            field: "value",
            data: chartData,
            startAngle: 150
        }],
        tooltip: {
            visible: true,
            template: "#= category #: #= kendo.format('{0:P1}', percentage)# (#= kendo.toString(value, 'n0') #)"
        },
        transitions: true
    });
}

function renderDonutChart(container, data, settings) {
    const categoryField = settings.categoryField || settings.series?.[0]?.categoryField || Object.keys(data[0])[0];
    const valueField = settings.valueField || settings.series?.[0]?.field || Object.keys(data[0])[1];

    const grouped = {};
    data.forEach(item => {
        const cat = item[categoryField];
        grouped[cat] = (grouped[cat] || 0) + item[valueField];
    });

    let chartData = Object.entries(grouped).map(([category, value]) => ({ category, value }));
    chartData.sort((a, b) => b.value - a.value);

    if (chartData.length > 10) {
        const top = chartData.slice(0, 9);
        const otherSum = chartData.slice(9).reduce((sum, d) => sum + d.value, 0);
        top.push({ category: "Other", value: otherSum });
        chartData = top;
    }

    const colorPalette = ["#9B38D4", "#0AD69F", "#EF466F", "#FFD166", "#26547C", "#212529"];
    chartData = chartData.map((d, i) => ({
        category: d.category,
        value: d.value,
        color: colorPalette[i % colorPalette.length]
    }));

    container.kendoChart({
        title: { text: settings.title || "" },
        legend: { visible: true, position: "top" },
        seriesDefaults: {
            labels: {
                visible: true,
                position: "outsideEnd",
                background: "transparent",
                template: "#= category # - #= kendo.format('{0:P1}', percentage)#"
            }
        },
        series: [{
            type: "donut",
            data: chartData
        }],
        tooltip: {
            visible: true,
            template: "#= category # - #= kendo.format('{0:P1}', percentage)# (#= kendo.toString(value, 'n0') #)"
        }
    });
}

function renderBarChart(container, data, settings) {
    if (!data || !data.length) return;
    const sample = data[0];
    const fields = Object.keys(sample);
    const numericFields = fields.filter(k => typeof sample[k] === "number" && !isNaN(sample[k]));
    const textFields = fields.filter(k => typeof sample[k] === "string");
    let categoryField = settings.categoryField;
    if (!categoryField) {
        let candidate = textFields[0];
        let lowestUniqueCount = Infinity;
        for (const field of textFields) {
            const uniqueCount = new Set(data.map(d => d[field])).size;
            if (uniqueCount > 1 && uniqueCount < lowestUniqueCount) {
                candidate = field;
                lowestUniqueCount = uniqueCount;
            }
        }
        categoryField = candidate;
    }
    let valueField = settings.valueField;
    if (!valueField) {
        const preferredNumeric = numericFields.find(f =>
            /count|total|number|value|score|index|trend|amount|observed|avg|mean/i.test(f)
        );
        valueField = preferredNumeric || numericFields[0];
    }
    if (sample.start && sample.end && !numericFields.length) {
        data = data.map(d => {
            const start = new Date(d.start);
            const end = new Date(d.end);
            const duration = (isFinite(start) && isFinite(end)) ? (end - start) / 3600000 : 0;
            return Object.assign({}, d, { durationHours: duration });
        });
        valueField = "durationHours";
    }
    const titleText = settings.title || `${valueField} per ${categoryField}`;
    container.kendoChart({
        dataSource: { data },
        seriesDefaults: { type: settings.type || "bar" },
        series: [{
            type: settings.type || "bar",
            field: valueField,
            categoryField: categoryField,
            color: settings.color || "#4CAF50"
        }],
        title: { text: titleText },
        categoryAxis: {
            labels: { rotation: "auto", step: 2 },
            majorGridLines: { visible: false }
        },
        valueAxis: {
            line: { visible: false },
            minorGridLines: { visible: true }
        },
        tooltip: settings.tooltip || {
            visible: true,
            template: `#= ${categoryField} #: #= kendo.toString(${valueField}, 'n0') #`
        },
        transitions: true
    });
}

function renderAreaChart(container, data, settings) {
    const colorPalette = ["#9B38D4", "#0AD69F", "#EF466F", "#FFD166", "#26547C", "#212529"];
    container.kendoChart({
        dataSource: { data },
        seriesDefaults: { type: "area", style: "smooth", opacity: 0.7 },
        series: [{
            type: "area",
            categoryField: settings.categoryField,
            field: settings.valueField,
            color: settings.color || colorPalette[0]
        }],
        colors: colorPalette,
        legend: { visible: true, position: "top" },
        tooltip: { visible: true, template: "#= category #: #= kendo.toString(value, 'n1') # units" },
        transitions: true
    });
}


function renderMap(container, data, settings) {
    container.empty();

    const tooltipMap = settings.tooltip || {};

    const coordsMap = {
        "India": [20.59, 78.96],
        "Malaysia": [4.21, 101.98],
        "Nepal": [28.39, 84.12],
        "Bhutan": [27.51, 90.43],
        "Vietnam": [14.06, 108.28],
        "Thailand": [15.87, 100.99],
        "Myanmar": [21.91, 95.96],
        "Indonesia": [-0.79, 113.92],
        "China": [35.86, 104.19],
        "Australia": [-25.27, 133.77],
        "USA": [37.09, -95.71],
        "Canada": [56.13, -106.35],
        "Brazil": [-14.23, -51.92],
        "Mexico": [23.63, -102.55],
        "Venezuela": [6.42, -66.59],
        "Belize": [17.19, -88.50],
        "Central African Republic": [6.61, 20.94],
        "Sudan": [12.86, 30.22],
        "United Kingdom": [55.38, -3.44],
        "Germany": [51.17, 10.45],
        "France": [46.23, 2.21],
        "Spain": [40.46, -3.75],
        "Italy": [41.87, 12.57],
        "Netherlands": [52.13, 5.29],
        "Sweden": [60.13, 18.64],
        "Norway": [60.47, 8.47],
        "Poland": [51.92, 19.15],
        "Greece": [39.07, 21.82],
        "Japan": [36.20, 138.25],
        "South Korea": [35.91, 127.77],
        "Philippines": [12.88, 121.77],
        "Saudi Arabia": [23.88, 45.08],
        "Turkey": [38.96, 35.24],
        "South Africa": [-30.56, 22.94],
        "Nigeria": [9.08, 8.68],
        "Egypt": [26.82, 30.80],
        "Kenya": [0.02, 37.91],
        "Morocco": [31.79, -7.09],
        "Ethiopia": [9.15, 40.49],
        "Ghana": [7.95, -1.02],
        "Tanzania": [-6.37, 34.89],
        "New Zealand": [-40.90, 174.89],
        "Papua New Guinea": [-6.31, 143.96],
        "Fiji": [-17.71, 178.07],
        "Congo (DRC)": [-4.0383, 21.7587],
        "Côte d'Ivoire": [7.54, -5.55],
        "Guinea": [9.95, -9.70],
        "Liberia": [6.43, -9.42],
        "Malaysia (Borneo)": [2.5, 113.5]
    };

    const markers = [];
    for (const c in tooltipMap) {
        const coords = coordsMap[c] || [20, 0];
        markers.push({
            location: coords,
            shape: settings.marker?.shape || "pin",
            tooltip: { content: tooltipMap[c] }
        });
    }

    container.kendoMap({
        center: settings.center || [10, 20],
        zoom: settings.zoom || 3,
        layers: [{
            type: "tile",
            urlTemplate: "https://#= subdomain #.tile.openstreetmap.org/#= zoom #/#= x #/#= y #.png",
            subdomains: ["a", "b", "c"]
        }],
        markers: markers
    });
}


function renderStockChart(container, data, settings) {
    const dateField = settings.categoryField || Object.keys(data[0]).find(k => /date/i.test(k));
    if (!dateField) return;

    data.forEach(d => {
        if (typeof d[dateField] === "string") {
            const parsed = new Date(d[dateField]);
            if (!isNaN(parsed)) d[dateField] = parsed;
        }
    });

    const hasOHLC = ["Open", "High", "Low", "Close"].every(f => Object.keys(data[0]).includes(f));
    const series = hasOHLC ? [{
        type: "candlestick",
        openField: "Open",
        highField: "High",
        lowField: "Low",
        closeField: "Close",
        categoryField: dateField
    }] : [{
        type: "line",
        field: settings.valueField || Object.keys(data[0]).find(k => typeof data[0][k] === "number"),
        categoryField: dateField
    }];

    const firstDate = data[0][dateField];
    const lastDate = data[data.length - 1][dateField];

    container.kendoStockChart({
        dataSource: { data },
        title: { text: typeof settings.title === "string" ? settings.title : "Stock Data Overview" },
        dateField: dateField,
        series: series,
        categoryAxis: {
            labels: { rotation: "auto" }
        },
        navigator: {
            visible: true,
            series: {
                type: "area",
                field: "Close"
            },
            categoryAxis: {
                labels: { rotation: "auto" }
            },
            select: {
                from: new Date(firstDate),
                to: new Date(lastDate)
            }
        },
        tooltip: {
            visible: true,
            template: "Open: #= dataItem.Open #\nHigh: #= dataItem.High #\nLow: #= dataItem.Low #\nClose: #= dataItem.Close #"
        },
        transitions: true
    });
}

function renderScheduler(container, data, settings = {}) {
    if (!data || !data.length) return;

    const fieldNames = Object.keys(data[0]);
    const startField = fieldNames.find(k => /start|begin|from|date/i.test(k));
    const endField = fieldNames.find(k => /end|to|finish/i.test(k)) || startField;
    const titleField = fieldNames.find(k => /task|title|event|subject/i.test(k)) || fieldNames[0];
    const descField = fieldNames.find(k => /desc|detail|note/i.test(k));

    function excelToDate(value) {
        if (typeof value === "number") {
            const excelEpoch = new Date(1899, 11, 30);
            return new Date(excelEpoch.getTime() + value * 86400000);
        }
        const date = new Date(value);
        return isNaN(date) ? null : date;
    }

    const cleanedData = data.map((d, i) => {
        const start = excelToDate(d[startField]);
        let end = excelToDate(d[endField]);
        if (!end || end < start) end = new Date(start.getTime() + 60 * 60 * 1000);
        return {
            id: d.id || i + 1,
            title: d[titleField] || `Event ${i + 1}`,
            start,
            end,
            description: d[descField] || ""
        };
    }).filter(e => e.start && e.end);

    container.kendoScheduler({
        date: cleanedData[0]?.start || new Date(),
        timezone: settings.timezone || "Etc/UTC",
        height: settings.height || 600,
        views: [
            "day",
            "week",
            { type: "month", selected: true }
        ],
        dataSource: {
            data: cleanedData,
            schema: {
                model: {
                    id: "id",
                    fields: {
                        start: { type: "date" },
                        end: { type: "date" },
                        title: { from: "title" },
                        description: { from: "description" }
                    }
                }
            }
        },
        editable: {
            template: kendo.template(`
                <div class='k-edit-label'><label for='title'>Title</label></div>
                <div class='k-edit-field'><input type='text' class='k-input k-textbox' name='title' data-bind='value:title'></div>
                <div class='k-edit-label'><label for='start'>Start</label></div>
                <div class='k-edit-field'><input data-role='datetimepicker' name='start' data-bind='value:start'></div>
                <div class='k-edit-label'><label for='end'>End</label></div>
                <div class='k-edit-field'><input data-role='datetimepicker' name='end' data-bind='value:end'></div>
                <div class='k-edit-label'><label for='description'>Description</label></div>
                <div class='k-edit-field'><textarea class='k-textbox' name='description' data-bind='value:description' rows='4'></textarea></div>
            `)
        }
    });
}






