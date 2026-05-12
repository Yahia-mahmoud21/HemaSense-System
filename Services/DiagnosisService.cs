using HemaSense.Models;
using System;
using System.Text.Json.Serialization;

namespace HemaSense.Services
{
    /// <summary>
    /// Rule-based CBC diagnosis service.
    /// The Python project uses a pickled scikit-learn DecisionTree which cannot
    /// be directly loaded in .NET. This service replicates the same fallback
    /// rule-based logic from main.py plus adds richer clinical thresholds.
    /// To use a real ML model, export it with ONNX and reference Microsoft.ML.OnnxRuntime.
    /// </summary>
    public class DiagnosisResponse
    {
        [JsonPropertyName("diagnosis")]
        public string Diagnosis { get; set; } = string.Empty;
        
        [JsonPropertyName("confidence")]
        public double Confidence { get; set; }
    }

    public class DiagnosisService
    {
        private readonly HttpClient _httpClient;

        public DiagnosisService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<(string Diagnosis, double Confidence)> PredictAsync(PredictRequest data)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("http://127.0.0.1:7500/api/predict", data);
                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<DiagnosisResponse>();
                    if (result != null)
                    {
                        return (result.Diagnosis, result.Confidence);
                    }
                }
                return ("Error calling ML server", 0.0);
            }
            catch (Exception ex)
            {
                return ($"Error: {ex.Message}", 0.0);
            }
        }
    }
}
