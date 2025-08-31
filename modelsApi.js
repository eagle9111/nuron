export const modelMap = {
  "70meterdish": require("./assets/models/70meterdish.glb"),
  "apollo11": require("./assets/models/Astronaut.glb"),
};

export async function fetchModels() {
  return [
    {
      id: "70meterdish",
      title: "70 Meter Deep Space Dish",
      description: "A large NASA radio telescope used for deep space communications.",
      thumbnail: require("./assets/images/icon.jpg"),
      modelAsset: "70meterdish", 
    },
    {
      id: "apollo11",
      title: "Apollo 11 Command Module",
      description: "The spacecraft that carried astronauts to the Moon.",
      thumbnail: require("./assets/images/icon.jpg"),
      modelAsset: "apollo11", 
    },
  ];
}