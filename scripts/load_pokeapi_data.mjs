#!/usr/bin/env zx

for (let id = 1; id <= 151; id++) {
  const pokemonType = await fetchOrReadFromFile(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const species = await fetchOrReadFromFile(pokemonType.species.url)

  const pokemon = pokemonTypeToPokemon(pokemonType, species)

  await saveToIndex('pokemons_gen1', pokemon, id);
}

for (let id = 152; id <= 251; id++) {
  const pokemonType = await fetchOrReadFromFile(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const species = await fetchOrReadFromFile(pokemonType.species.url)

  const pokemon = pokemonTypeToPokemon(pokemonType, species)

  await saveToIndex('pokemons_gen2', pokemon, id);
}

async function fetchOrReadFromFile(url){
  if(url.endsWith("/")){
    url = url.substring(0, url.length-1)
  }
  const urlComponents = url.split('/');
  const filename = `local-data/${urlComponents[urlComponents.length - 2]}_${urlComponents[urlComponents.length - 1]}.json`;

  if(fs.pathExistsSync(filename)){
    return fs.readJson(filename)
  }

  const response = await fetch(url)
  const data = await response.json()

  fs.writeFileSync(filename, JSON.stringify(data, null, 2))

  return data
}


async function saveToIndex(indexName, data, id){
  const options = {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ZWxhc3RpYzp4ZjlEVjF3UnR4aHJUUHFqR0lpVnJsRjQ='
    },

  }
  await fetch(`https://fictional-characters.es.europe-west1.gcp.cloud.es.io/${indexName}/_doc/${id}`, options);
}

function pokemonTypeToPokemon(pokemonType, species){
  const hp = pokemonType.stats.find(it => it.stat.name === "hp").base_stat
  const attack = pokemonType.stats.find(it => it.stat.name === "attack").base_stat
  const defense = pokemonType.stats.find(it => it.stat.name === "defense").base_stat
  const speed = pokemonType.stats.find(it => it.stat.name === "speed").base_stat
  const types = pokemonType.types.map(it => it.type.name)

  const flavorText = species.flavor_text_entries.find(it => it.language.name==="fr").flavor_text

  console.log(flavorText)

  return {
    id: pokemonType.id,
    name: pokemonType.name,
    height: pokemonType.height,
    weight: pokemonType.weight,
    stats: {
      hp,
      attack,
      defense,
      speed
    },
    types,
    description: flavorText.replaceAll("\n", " ")
  }
}
