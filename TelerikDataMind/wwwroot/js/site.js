$(document).ready(function () {
    setTimeout(() => {
        // Insert file attachment icon.
        if ($(".k-upload-button-wrap .k-upload-button").length > 0) {
            $("<span class='attachment-icon'></span>").insertBefore(".k-upload-button-wrap .k-upload-button");
            kendo.ui.icon($("span.attachment-icon"), { icon: 'paperclip' });
        }
    }, 1);

    $(window).on("resize", function () {
        kendo.resize($(".k-chart, .k-grid"));
    });

    $("#requestForm").on("submit", function (e) {
        e.preventDefault();
        var validator = $("#requestForm").data("kendoValidator");
        var upload = $("#DataFile").data("kendoUpload");
        var uplaodedFiles = upload.getFiles();
        if (validator.validate() && uplaodedFiles.length > 0) {

            showLoader();
            $("#ai-placeholder").fadeOut(500);
            $("#loader-overlay").css("display", "flex");

            // Get form data
            var formData = new FormData(this);
            var prompt = formData.get('Prompt');
            var selectedComponents = formData.getAll('SelectedComponents');

            generateDashboard(prompt, selectedComponents);
        } else {
            alert("Please upload a file.");
        }
    });
    
});

function generateDashboard(promptMessage, selectedComponents) {
    // Sanitize the prompt before sending
    promptMessage = sanitizePrompt(promptMessage);

    var upload = $("#DataFile").data("kendoUpload");
    var uplaodedFiles = upload.getFiles();
    const uploadedFile = uplaodedFiles[0].name;
    const uploadPath = "/Uploads/" + uploadedFile;
    console.log(uploadedFile);
    fetch(uploadPath)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.SheetNames[0];
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
            $.ajax({
                url: "/File/AnalyzeJson",
                type: "POST",
                data: JSON.stringify({ fileName: uploadedFile, jsonData: rows, prompt: promptMessage, components: selectedComponents }),
                contentType: "application/json",
                success: function (res) {
                    console.log(res);
                    const data = typeof res === "string" ? JSON.parse(res) : res;
                    if (data.summary && data.summary.length > 0) {
                        const summaryHTML = `
                                    <div class="summary-container">
                                        ${data.summary.map((text, i) => `
                                            <div class="summary-card fade-in" style="--delay:${i * 0.1}s">
                                                <div class="summary-icon">
                                                    <span class="k-icon k-i-lightbulb"></span>
                                                </div>
                                                <div class="summary-content">
                                                    <h4>Insight ${i + 1}</h4>
                                                    <p>${text}</p>
                                                </div>
                                            </div>
                                        `).join("")}
                                    </div>
                                `;
                        $("#summary").html(summaryHTML);
                    }
                    if (data.widgets && data.widgets.length > 0) {
                        renderWidgets(data.widgets, rows);
                    }
                    hideLoader();
                },
                error: function () {
                    hideLoader();
                    alert("Error analyzing file");
                }
            });
        });
}

function onSpeechToTextResult(e) {
    var transcript = e.alternatives[0].transcript;
    transcript = sanitizePrompt(transcript);
    $("#Prompt").data("kendoTextArea").value(`${transcript}`);
}

function showLoader() {
    if (!$("#aiLoader").data("kendoLoader")) {
        $("#aiLoader").kendoLoader({
            type: "infinite-spinner",
            themeColor: "success",
            size: "large"
        });
    }
    $("#loader-overlay").css("display", "flex");
}

function hideLoader() {
    $("#loader-overlay").css("display", "none");
}

// sanitization function
function sanitizePrompt(prompt) {
    if (!prompt || typeof prompt !== 'string') {
        return '';
    }
    
    // Remove HTML tags
    prompt = prompt.replace(/<[^>]*>/g, '');
    // Remove script-like content
    prompt = prompt.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove potentially dangerous characters but keep AI-friendly ones
    prompt = prompt.replace(/[<>"'&]/g, '');
    // Normalize whitespace
    prompt = prompt.replace(/\s+/g, ' ').trim();
    // Limit length
    if (prompt.length > 2000) {
        prompt = prompt.substring(0, 2000);
    }
    return prompt;
}

//function onUploadSuccess(e) {
//    if (e.operation === "upload") {
//        showLoader();
//        $("#ai-placeholder").fadeOut(500);
//        const uploadedFile = e.files[0].name;
//        const uploadPath = "/Uploads/" + uploadedFile;
//        fetch(uploadPath)
//            .then(res => res.arrayBuffer())
//            .then(buffer => {
//                const data = new Uint8Array(buffer);
//                const workbook = XLSX.read(data, { type: 'array' });
//                const firstSheet = workbook.SheetNames[0];
//                const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet]);
//                $.ajax({
//                    url: "/File/AnalyzeJson",
//                    type: "POST",
//                    data: JSON.stringify({ fileName: uploadedFile, jsonData: rows }),
//                    contentType: "application/json",
//                    success: function (res) {
//                        console.log(res);
//                        const data = typeof res === "string" ? JSON.parse(res) : res;
//                        if (data.summary && data.summary.length > 0) {
//                            const summaryHTML = `
//                                    <div class="summary-container">
//                                        ${data.summary.map((text, i) => `
//                                            <div class="summary-card fade-in" style="--delay:${i * 0.1}s">
//                                                <div class="summary-icon">
//                                                    <span class="k-icon k-i-lightbulb"></span>
//                                                </div>
//                                                <div class="summary-content">
//                                                    <h4>Insight ${i + 1}</h4>
//                                                    <p>${text}</p>
//                                                </div>
//                                            </div>
//                                        `).join("")}
//                                    </div>
//                                `;
//                            $("#summary").html(summaryHTML);
//                        }
//                        if (data.widgets && data.widgets.length > 0) {
//                            renderWidgets(data.widgets, rows);
//                        }
//                        hideLoader();
//                    },
//                    error: function () {
//                        hideLoader();
//                        alert("Error analyzing file");
//                    }
//                });
//            });
//    }
//}
