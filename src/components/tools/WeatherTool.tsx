import { useEffect } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { FunctionDeclaration, Type } from "@google/genai";

/**
 * 1. Define the tool declaration
 * This tells Gemini what the function does and what parameters it accepts.
 */
export const weatherDeclaration: FunctionDeclaration = {
  name: "get_weather",
  description: "Returns the current weather for a given location.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: {
        type: Type.STRING,
        description: "The city and state, e.g. San Francisco, CA",
      },
      unit: {
        type: Type.STRING,
        enum: ["celsius", "fahrenheit"],
        description: "The temperature unit to use.",
      },
    },
    required: ["location"],
  },
};

export function WeatherTool() {
  const { client, setConfig } = useLiveAPIContext();

  /**
   * 2. Register the tool
   * We add our declaration to the setConfig call.
   * Note: In a real app, you might want to merge this with other tools.
   */
  useEffect(() => {
    setConfig({
      // model: "models/gemini-2.0-flash-exp",
      tools: [
        { googleSearch: {} },
        { functionDeclarations: [weatherDeclaration] },
      ],
    });
  }, [setConfig]);

  /**
   * 3. Handle the tool call
   * We listen for 'toolcall' events and respond if the name matches.
   */
  useEffect(() => {
    const onToolCall = (toolCall: any) => {
      console.log("Tool call received:", toolCall);
      const fc = toolCall.functionCalls.find(
        (fc: any) => fc.name === weatherDeclaration.name,
      );

      if (fc) {
        const { location, unit = "celsius" } = fc.args as any;
        console.log(`Fetching weather for ${location} in ${unit}`);

        // Mock weather data
        const weatherResponse = {
          location,
          temperature: unit === "celsius" ? 22 : 72,
          condition: "Sunny",
          unit,
        };

        // 4. Send the response back to Gemini
        client.sendToolResponse({
          functionResponses: [
            {
              response: { output: weatherResponse },
              id: fc.id,
              name: fc.name,
            },
          ],
        });
      }
    };

    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  return null; // This component doesn't need to render anything
}
