// src/utils/downloadCsvFromApi.js
export async function downloadCsvFromApi(url, filename = "export.csv") {
  try {
    const res = await fetch(url, {
      method: "GET",
      // if your API is on a different domain and needs cookies:
      // credentials: "include",
    });

    if (!res.ok) {
      throw new Error(`Request failed: ${res.status}`);
    }

    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    console.error("CSV download error:", err);
    alert("Failed to download CSV");
  }
}
