# elasticsearch pour les ops

## Jour 2

---

## Objectifs de la journée

* Comprendre les _mappings_ et savoir les déclarer.
* Savoir paramétrer un _index_.
* Comprendre et maitriser les _alias_.
* Savoir faire des réindexations, split et shrink.

---

## Mapping

> La définition des _champs_ d'un _index_, nom et types. Utilisé pour définir comment les champs doivent être indexés et recherchés.

2 méthodes:

* dynamic field mapping : automatique, facile, peu optimisé
* explicit mapping : manuel, optimisé, nécessite une bonne connaissance de la data

===

### Dynamic Field Mapping ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/dynamic-field-mapping.html))

* pas de déclaration préalable de la structure de l'_index_ (_mapping_)
* Elasticsearch essaye de deviner les types des différents champs
* attention aux types de données envoyées dans le JSON :
    * `"true" != true`
    * `"1" != 1`

L'indexation _basique_ permet de démarrer rapidement, mais n'est pas optimisée.

===

Qu'est ce que ça donne si on indexe ce document ?

```json
{
	"booleanString": "true",
	"booleanType": true,
    "dateString": "2023/03/16",
    "dateStringISO": "2023-03-16",
	"dateStringFr": "16/03/2023",
	"intString": "12",
	"intType": 12,
	"floatStringFR": "12,3",
	"floatStringUS": "12.3",
	"floatType": 12.3
}
```

===

Qu'est ce que ça donne si on indexe ce document ?

```json
{
	"booleanString": "true",       => text
	"booleanType": true,           => boolean
    "dateString": "2023/03/16",    => date
    "dateStringISO": "2023-03-16", => date
	"dateStringFr": "16/03/2023",  => text
	"intString": "12",             => text
	"intType": 12,                 => long
	"floatStringFR": "12,3",       => text
	"floatStringUS": "12.3",       => text
	"floatType": 12.3              => float
}
```

===

### Auto détection

| valeur JSON                       | type détecté |
|-----------------------------------|--------------|
| `true` ou `false`                 | `boolean`    |
| `"true"` ou `"false"`             | `text`       |
| Une date ISO : `"2023-03-21"`     | `date`       |
| Une date pas ISO : `"2023/03/21"` | `date`       |
| Une date FR : `"21/03/2023"`      | `text`       |

===

| valeur JSON                         | type détecté |
|-------------------------------------|--------------|
| `12`                                | `long`       |
| `12.5`                              | `float`      |
| `"12"`                              | `text`       |
| `"12.5"`                            | `text`       |
| `"Je suis ton père"`                | `text`       |

---

## Explicit Field Mapping

Le _Dynamic Field Mapping_ n'est en général pas suffisant:

* la détection des types est minimal (cf `"true"` et `"12.5"` détectés en `text`).
* un mauvais typage = une mauvaise indexation = de mauvaises perfs

Le field mapping permet de déclarer le typage des champs manuellement.

===

### Les types de champs les plus courants ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-types.html))

* `text` : recherches _full texte_
  ex : `"Votre manque de foi me consterne."`
* `keyword` : recherche _exacte_
  ex : `"Jedi"`, `"Sith"`, des id...
* `boolean` : `true`, `false`
* `integer`, `long`, `float`, `double` : Données numériques. Requêtes en `range`.
  ex :  `1`, `12.5`
* `date` : Données temporelle (à la milliseconde). Converties en UTC, et stockées en `long`.

===

### Les autres types de champs

* `range` : plage de valeurs numériques, min/max, dates, adresses IP.
  ex : `{ "gte" : 10, "lt" : 20 }`
* `ip`: adresse IP (v4 ou v6)
  ex : `"192.168.0.0/16"`
* `geo_point` : latitude et une longitude
  ex : `{ "lat": 41.12, "lon": -71.34 }`              |
* `fields` : Type particulier permettant d'indexer un champ de 2 manières (`text` + `keyword` par exemple)

===

### Déclarer un mapping

La déclaration d'un mapping se fait à la création de l'index !

Il est possible de déclarer des champs supplémentaires à un index existant.

Il n'est pas possible de modifier le mapping d'un champ existant (il faut réindexer les données).

===

### Déclaration du mapping à la création de l'index ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/explicit-mapping.html))

Avec la propriété `mapping`

```http request
PUT dragonball_characters
```
```json
{
  "mappings": {
    "properties": {
      "name": {
        "type": "keyword"
      },
      "birthdate": {
        "type": "date"
      },
      "favorite_quote": {
        "type": "text"
      }
    }
  }
}
```

===

### Voir le mapping d'un index

```http request
GET starwars_characters/_mapping
```
```json
{
  "starwars_characters": {
    "mappings": {
      "properties": {
        "affiliation": {
          "type": "keyword"
        },
        "name": {
          "type": "text"
        },
        "quote": {
          "type": "text"
        },
        "species": {
          "type": "keyword"
        }
      }
    }
  }
}
```

===

### Ne pas indexer tous les champs ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-index.html))

Il est possible de déclarer des champs comme ne devant pas être indexés.
Il sera toujours possible de les requêter mais c'est contre-performant.

```json
{
  "starwars_characters": {
    "mappings": {
      "properties": {
        "affiliation": {
          "type": "keyword",
          "index": false
        },
        "name": {
          "type": "text"
        },
        "quote": {
          "type": "text"
        },
        "species": {
          "type": "keyword"
        }
      }
    }
  }
}
```

===

### `text` vs `keyword`

#### `text` ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/text.html))

Les données des champs `text` sont analysées pour être indexées en vue d'une recherche _full texte_ :

* tokenization : découpage du texte en tokens (mots)
* normalization : passage en minuscules, réduction des mots (singulier, infinitif)

Les chaînes passées à une requête `match` suivent le même process

===

#### Analyseurs de texte ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-analyzers.html))

`standard` :

> "Votre manque de foi me consterne." => ["votre"] -> ["manque"] -> ["de"] -> ["foi"] -> ["me"] -> ["consterne"]

`french` :

> "Votre manque de foi me consterne." => ["manqu"] -> ["foi"] -> ["constern"]

===

Le choix d'un analyseur a des impacts sur la taille de l'index et la performance de la recherche.

L'analyseur `standard` est par défaut et fonctionne pour la plupart des cas.

===

Exemple: 2 docs, 1 champ avec l'analyseur `standard` :
```json
{
  "health": "green",
  "status": "open",
  "index": "starwars_characters",
  "uuid": "Rw_RUSx7QnycqTrXMso90A",
  "pri": "1",
  "rep": "1",
  "docs.count": "2",
  "docs.deleted": "0",
  "store.size": "11.4kb",
  "pri.store.size": "11.4kb"
}
```

===

Exemple: 2 docs, 1 champ avec l'analyseur `french` :
```json
	{
  "health": "green",
  "status": "open",
  "index": "starwars_characters",
  "uuid": "QjtqiacSSYC-5cN9UISQpw",
  "pri": "1",
  "rep": "1",
  "docs.count": "2",
  "docs.deleted": "0",
  "store.size": "11.1kb",
  "pri.store.size": "11.1kb"
}
```

===

#### Test des analyseurs de texte ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-analyze.html))

```http request
GET /_analyze
```
```json
{
  "analyzer" : "standard",
  "text" : "I am the prince of all Saiyans once again! And I am not like Kakarot!"
}
```

```json
{
  "tokens": [
    {
      "token": "i",
      "start_offset": 0,
      "end_offset": 1,
      "type": "<ALPHANUM>",
      "position": 0
    },
    {
      "token": "am",
      "start_offset": 2,
      "end_offset": 4,
      "type": "<ALPHANUM>",
      "position": 1
    },
    {
      "token": "the",
      "start_offset": 5,
      "end_offset": 8,
      "type": "<ALPHANUM>",
      "position": 2
    },
    {
      "token": "prince",
      "start_offset": 9,
      "end_offset": 15,
      "type": "<ALPHANUM>",
      "position": 3
    },
    {
      "token": "of",
      "start_offset": 16,
      "end_offset": 18,
      "type": "<ALPHANUM>",
      "position": 4
    },
    {
      "token": "all",
      "start_offset": 19,
      "end_offset": 22,
      "type": "<ALPHANUM>",
      "position": 5
    },
    {
      "token": "saiyans",
      "start_offset": 23,
      "end_offset": 30,
      "type": "<ALPHANUM>",
      "position": 6
    },
    {
      "token": "once",
      "start_offset": 31,
      "end_offset": 35,
      "type": "<ALPHANUM>",
      "position": 7
    },
    {
      "token": "again",
      "start_offset": 36,
      "end_offset": 41,
      "type": "<ALPHANUM>",
      "position": 8
    },
    {
      "token": "and",
      "start_offset": 43,
      "end_offset": 46,
      "type": "<ALPHANUM>",
      "position": 9
    },
    {
      "token": "i",
      "start_offset": 47,
      "end_offset": 48,
      "type": "<ALPHANUM>",
      "position": 10
    },
    {
      "token": "am",
      "start_offset": 49,
      "end_offset": 51,
      "type": "<ALPHANUM>",
      "position": 11
    },
    {
      "token": "not",
      "start_offset": 52,
      "end_offset": 55,
      "type": "<ALPHANUM>",
      "position": 12
    },
    {
      "token": "like",
      "start_offset": 56,
      "end_offset": 60,
      "type": "<ALPHANUM>",
      "position": 13
    },
    {
      "token": "kakarot",
      "start_offset": 61,
      "end_offset": 68,
      "type": "<ALPHANUM>",
      "position": 14
    }
  ]
}
```

===

#### Les analyseurs disponibles ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-analyzers.html))

`standard`, `english`, `french`, ...

```http request
GET /_analyze
```
```json
{
  "analyzer" : "english",
  "text" : "I am the prince of all Saiyans once again! And I am not like Kakarot!"
}
```

```json
{
  "tokens": [
    {
      "token": "i",
      "start_offset": 0,
      "end_offset": 1,
      "type": "<ALPHANUM>",
      "position": 0
    },
    {
      "token": "am",
      "start_offset": 2,
      "end_offset": 4,
      "type": "<ALPHANUM>",
      "position": 1
    },
    {
      "token": "princ",
      "start_offset": 9,
      "end_offset": 15,
      "type": "<ALPHANUM>",
      "position": 3
    },
    {
      "token": "all",
      "start_offset": 19,
      "end_offset": 22,
      "type": "<ALPHANUM>",
      "position": 5
    },
    {
      "token": "saiyan",
      "start_offset": 23,
      "end_offset": 30,
      "type": "<ALPHANUM>",
      "position": 6
    },
    {
      "token": "onc",
      "start_offset": 31,
      "end_offset": 35,
      "type": "<ALPHANUM>",
      "position": 7
    },
    {
      "token": "again",
      "start_offset": 36,
      "end_offset": 41,
      "type": "<ALPHANUM>",
      "position": 8
    },
    {
      "token": "i",
      "start_offset": 47,
      "end_offset": 48,
      "type": "<ALPHANUM>",
      "position": 10
    },
    {
      "token": "am",
      "start_offset": 49,
      "end_offset": 51,
      "type": "<ALPHANUM>",
      "position": 11
    },
    {
      "token": "like",
      "start_offset": 56,
      "end_offset": 60,
      "type": "<ALPHANUM>",
      "position": 13
    },
    {
      "token": "kakarot",
      "start_offset": 61,
      "end_offset": 68,
      "type": "<ALPHANUM>",
      "position": 14
    }
  ]
}
```


===

#### Déclaration d'un analyseur de texte

```http request
PUT starwars_characters
```
```json
{
  "mappings": {
    "properties": {
      "affiliation": {
        "type": "keyword"
      },
      "name": {
        "type": "text"
      },
      "quote": {
        "type": "text",
        "analyzer": "english"
      },
      "species": {
        "type": "keyword"
      }
    }
  }
}
```

===

#### `keyword` ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/keyword.html))

Les données des champs `keyword` sont prévues pour faire un matching _exact_, pas d'analyse.

> "Darth Vader" != "darth vader" dans ce modèle

===

Exemple d'un mapping keyword:

```json
{
  "mappings": {
    "properties": {
      "name": {
        "type": "keyword"
      }
    }
  }
}
```

===

#### Recherche exacte

Document :

```json
{ "name": "Darth Vader" }
```

Query
```http request
GET starwars_characters/_search
```
```json
{
  "query": {
    "term": {
      "name": "darth vader"
    }
  }
}
```
Pas de résultat

===

Document :

```json
{ "name": "Darth Vader" }
```

Query
```http request
GET starwars_characters/_search
```

```json
{
  "query": {
    "term": {
      "name": "Darth Vader"
    }
  }
}
```
1 résultat

===

### Fields, et mapping multiples ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/multi-fields.html))

Il est possible de faire du mapping multiple sur des champs.

Ex: `text` + `keyword`, pour permettre une recherche exacte performante en plus d'une recherche full text.

C'est ce que fait _Elasticsearch_ par défaut sur les champs en mapping dynamique.

===

Exemple d'un mapping généré

```json
{
  "starwars_characters": {
    "mappings": {
      "properties": {
        "affiliation": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "name": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "quote": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "species": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        }
      }
    }
  }
}
```

===

Le mapping multiple crée en fait plusieurs champs.

Requêtes sur l'exemple précédent :

```json
{
  "query": {
    "match": {  // recherche full texte sur le champ name
      "name": "Darth Vader"
    }
  }
}
```

ou

```json
{
  "query": {
    "term": {  // recherche exacte sur le champ name.keyword
      "name.keyword": "Darth Vader"
    }
  }
}
```

===

### Indexations après un mapping explicit

Après avoir spécifié un mapping, lors d'une indexation, les données seront converties pour respecter les types précisés, par exemple :

* les `"true"` seront convertis en `true`
* les `"12"` seront convertis en `12`

===

#### Erreurs de type à l'indexation

Si un document à indexer ne peut pas être adapté pour respecter les types précisés, une erreur détaillée est retournée :

```json
{
  "error": {
    "root_cause": [
      {
        "type": "mapper_parsing_exception",
        "reason": "failed to parse field [height] of type [integer] in document with id '152'. Preview of field's value: 'douze'"
      }
    ],
    "type": "mapper_parsing_exception",
    "reason": "failed to parse field [height] of type [integer] in document with id '152'. Preview of field's value: 'douze'",
    "caused_by": {
      "type": "number_format_exception",
      "reason": "For input string: \"douze\""
    }
  },
  "status": 400
}
```

---

## TP Mapping

![](assets/Coding-workshop.png)

===

### Sujet

On réutilise les mêmes index qu'hier :

* pokemons_gen1
* pokemons_gen2

===

#### Exemple de document

Ces index contiennent des documents ayant cette forme : 

```json
{
  "id": "31",
  "name": "nidoqueen",
  "height": 13,
  "weight": 600,
  "stats": {
    "hp": 90,
    "attack": 92,
    "defense": 87,
    "speed": 76
  },
  "types": [
    "poison",
    "ground"
  ],
  "description": "Son corps est recouvert d’écailles solides. Il donnera sa vie pour secourir les petits de son terrier."
}
```

===

#### Créez un nouveau mapping 

* Observez le mapping des deux index
* Créez un mapping correct pour les index
  * `id`, `name` et `type`  en `keyword`
  * `description` en `texte` avec analyseur `french`
  * les autres champs en `integer`
* Créez deux index portant votre nom : pokemon_gen1_jwk et pokemon_gen2_jwk avec le bon mapping

===

### Correction des mappings

![](assets/Certification.png)

===

### Observations 

Stats avec mapping par défaut : 
```json
{
  "size_in_bytes": 175147
}
```

Stats avec mapping optimisé :
```json
{
  "size_in_bytes": 105945
}
```

Gain de disque de 30% 🎉

---

## Le paramétrage d'un index (index settings) ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html))

### Shards & replicas

* `index.number_of_shards` : nombre de shards primaires. Positionné à la création. Ne peut pas être modifié. Valeur à `1` par défaut.
* `index.number_of_replicas`: nom de shards _replica_ pour chaque shard _primaire_. Peut être modifié. Valeur à `1` par défaut. Ne jamais positionner à `0` => risque de perte de données.

===

### Refresh

* `index.refresh_interval`: temps de rafraichissement des données indexées pour les rendre visible à la recherche. Valeur à `1s` par défaut.
* `index.search.idle.after` : temps avant qu'un index soit considéré `idle`, et ne soit plus rafraichit. Valeur à `30s` par défaut.

===

### Récupération des settings d'un index

```http request
GET dragonball_characters/_settings
```
```json
{
  "dragonball_characters": {
    "settings": {
      "index": {
        "number_of_shards": "1",
        "provided_name": "dragonball_characters",
        "creation_date": "1679672494900",
        "number_of_replicas": "1",
        "uuid": "P9v7V56nT5-WNOhAP2Cxrw",
        "version": {
          "created": "8060299"
        }
      }
    }
  }
}
```

===

### Positionnement des settings à la création d'un index

Avec la propriété `settings`

```http request
PUT dragonball_characters
```
```json
{
  "mappings": {},
  "settings": {
    "index": {
      "number_of_shards": 2,
      "number_of_replicas": 1
    }
  }
}
```

===

### Mettre à jour les settings d'un index existant

```http request
PUT dragonball_characters/_settings
```
```json
{
  "settings": {
    "index": {
      "number_of_replicas": 1
    }
  }
}
```

===

#### Settings dynamiques ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/index-modules.html#index-modules-settings))

Tous les settings ne peuvent pas être mis à jour :

* `index.number_of_shards` le nombre de _shards_ est *fixé* à la création et ne peut pas être modifié

---

## Les alias

Permettent de nommer des index, ou les regrouper sous un nom différent.

Les alias ne sont pas dynamiques (doivent être recréés pour prendre en compte un nouvel index).

===

### Créer un alias au niveau du cluster

```http request
POST _aliases
```
```json
{
  "actions": [
    {
      "add": {
        "index": "*_characters", // le(s) index cibles
        "alias": "characters"    // le nom de l'alias
      }
    }
  ]
}
```

===

### Créer un alias sur un index ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/indices-add-alias.html))

```http request
PUT dragonball_characters/_alias
```
```json
{
  "actions": [
    {
      "add": {
        "alias": "characters"    // le nom de l'alias
      }
    }
  ]
}
```

===

### Lister les alias présents dans un cluster ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/indices-get-alias.html))

```http request
GET _alias
```
```json
{
  "dragonball_characters": {
    "aliases": {
      "characters": {}
    }
  },
  "starwars_characters": {
    "aliases": {
      "characters": {}
    }
  }
}
```

===

### Lister les alias ciblant un index

```http request
GET dragonball_characters/_alias
```
```json
{
  "dragonball_characters": {
    "aliases": {
      "characters": {}
    }
  }
}
```

===

### Supprimer un alias au niveau du cluster

```http request
POST _aliases
```
```json
{
  "actions": [
    {
      "remove": {
        "index": "*_characters",
        "alias": "characters"
      }
    }
  ]
}
```

===

### Supprimer un alias au niveau d'un index

```http request
DELETE dragonball_characters/aliases/characters
```

===

### Mettre à jour un alias

Il faut le supprimer et le recréer, c'est fait dans une seule opération, sans downtime.

```http request
POST _aliases
```
```json
{
  "actions": [
    {
      "remove": {
        "alias": "characters"
      }
    },
    {
      "add": {
        "index": "*_characters",
        "alias": "characters"
      }
    }
  ]
}
```

===

### Positionnement des alias à la création d'un index

Avec la propriété `aliases`

```http request
PUT dragonball_characters
```
```json
{
  "mappings": {},
  "settings": {},
  "aliases": {
    "characters": {}
  }
}
```

===

### Write index

Il est possible de faire des indexations sur un alias.
L'index cible doit être déclaré comme `is_write_index` lors de la création/modification de l'alias.

```http request
PUT dragonball_characters
```
```json
{
  "aliases": {
    "characters": {
      "is_write_index": true
    }
  }
}
```

===

### Filtres sur alias

Les documents remontés à la recherche sur l'alias seront filtrés avec la requête donnée.

```http request
PUT dragonball_characters/_alias
```
```json
{
  "actions": [
    {
      "add": {
        "alias": "over9000",
        "filter": {
          "range": {
            "power_level": {
              "gte": 9000
            }
          }
        }
      }
    }
  ]
}
```

---

## Les index templates ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/index-templates.html))

Un modèle d'index permet de préparer la création des futurs index :

* pattern de nommage
* mapping
* settings
* alias

Tous futurs index nommés suivant le pattern de nommage déclaré hériteront des paramètres du modèle.

===

### Création ou modification d'un template ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/indices-put-template.html))

```http request
PUT /_index_template/characters_template
```
```json
{
  "index_patterns" : ["*_characters"],
  "priority": 1,
  "template": {
    "settings" : {
      "number_of_shards" : 2
    },
    "aliases": {
      "characters": {}
    }
  }
}
```

===

### Suppression d'un template

```http request
DELETE /_index_template/characters_template
```

### Listing des templates

```http request
GET /_index_template
```

===

### Merge des données

Lors de la création d'un index, si le nom de l'index matche un `index_pattern` de template, les paramètres du template seront mergés avec ceux de l'index.

Les paramètres spécifiés à la création de l'index sont prioritaires sur ceux du template.

===

### Modification et priorité

La modification ou suppression d'un template ne modifie pas les index déjà créés.

La priorité sur un template permet de déterminer que template est appliqué si le nom de l'index matche 2 templates ou plus.

===

### Templates système

De nombreux _index templates_ sont instanciés par Elasticsearch et Kibana, attention à ne pas les supprimer.

---

## Détails d'un index

Aliases, Mappings, Settings

```http request
GET starwars_characters
```
```json
{
  "starwars_characters": {
    "aliases": {},
    "mappings": {
      "properties": {
        ...
      }
    },
    "settings": {
      "index": {
        "number_of_shards": "1",
        "provided_name": "starwars_characters",
        "creation_date": "1678875502566",
        "number_of_replicas": "1"
      }
    }
  }
}
```

---

## TP Alias, Settings et Templates

![](assets/Coding-workshop.png)

===

### Sujet

Nous reprenons les index manipulés jusqu'à présent :

* pokemons_gen1
* pokemons_gen2

===

#### Créez un alias

* Créez un _alias_ portant votre nom, qui pointe vers les deux index `pokemon_gen1` et `pokemon_gen2`
* Comptez le nombre de documents disponibles avec votre alias

===

#### Créez un _index template_

Créez un _index template_ portant votre nom :
* Qui va gérer les index dont le nom commence par `pokemon`
* Qui va utiliser le mapping créé au TP précédent
* Qui a pour settings un nombre de _shard_ à `2` et un nombre de _replica_ à `2`
* Qui ajoute les index à votre alias créé au point précédent

===

### Correction des alias et index template

![](assets/Certification.png)

---

## Allocation des shards aux _nodes_. ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/shard-allocation-filtering.html))

Dans un cluster hétérogène, on veut pouvoir contrôler l'allocation des shards sur des _node_.

Les _node_ ont des attributs par défaut : `_name`, `_host_ip`, `_publish_ip`, `_ip`, `_host`, `_id`, `_tier` and `_tier_preference`.

===

### Attributs customisés sur des nodes

Les _node_ peuvent avoir des attributs customisés (paramétrés dans `elasticsearch.yml`):

```yaml
node.attr.size: medium
node.attr.disk: ssd
node.attr.region: europe-west1
```

===

### Routage des index sur certains nodes

`index.routing.allocation` permet de contrôler l'allocation de l'index à des _nodes_

```http request
PUT <index>/_settings
```
```json
{
  "settings": {
    "index.routing.allocation.include.region": ["europe-west1","europe-west9"],
    "index.routing.allocation.require.disk": "ssd",
    "index.routing.allocation.exclude.size": "small"
  }
}
```

`include` : au moins une des valeurs. `require` : valeur obligatoire. `exclude` : valeur interdite.

===

### Router des shards manuellement

Il est possible de préciser manuellement une allocation de shard :

* forcer l'allocation d'un _shard_ à un _node_
* déplacer un _shard_ d'un _node_ à un autre

===

#### Routage d'un shard ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/cluster-reroute.html))

```http request
POST /_cluster/reroute
```
```json
{
  "commands": [
    {
      "move": {
        "index": "dragonball_characters", "shard": 0,
        "from_node": "nodeA", "to_node": "nodeB"
      }
    }
  ]
}
```

---

## Distribution des documents dans les shards (Partitionnement) ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/mapping-routing-field.html))

Elasticsearch distribue les documents dans les shards en fonction de l'id du document.

Il est possible de préciser une "clé de routage", pour regrouper des documents similaires dans un même shard.

Attention au risque d'avoir des shards non homogènes.

===

### Indexation avec clé de routage

Ajouter un paramètre `routing` lors de l'indexation :

```http request
POST dragonball_characters/_doc?routing=gentil
```
```json
{
  "name": "Goku",
  "race": "Saiyan",
  "birthdate": "0736-04-16T00:00:00Z",
  "power_level": 9001,
  "techniques": ["Kamehameha", "Spirit Bomb", "Kaio-ken"],
  "friends": ["Krillin", "Bulma", "Yamcha"],
  "enemies": ["Frieza", "Cell", "Majin Buu"],
  "favorite_quote": "I am the hope of the universe. I am the answer to all living things that cry out for peace. I am protector of the innocent. I am the light in the darkness. I am Goku!"
}
```

===

### Recherche avec clé de routage

Ajouter un paramètre `routing` lors de la recherche, permet de cibler uniquement les shards qui portent la partition

```http request
GET dragonball_characters/_search?routing=gentil
```

---

## Open/Close & Index Blocks

Par défaut, un index créé est _open_ :

* Il peut recevoir de nouveaux documents en indexation
* Il peut répondre à des requêtes

===

### Fermer un index

Un index peut être fermé pour économiser des ressources.
L'index sera toujours géré partiellement par le cluster pour s'assurer de la conservation des données des _shards_.

```http request
POST /starwars_characters/_close
```

Un index fermé ne peut ni recevoir de nouveaux documents, ni répondre à des recherches.

===

### Ouvrir un index

```http request
POST /starwars_characters/_open
```

===

### Index Blocks ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/index-modules-blocks.html))

Les _index blocks_ permettent de bloquer certaines opérations sur les index :

* passer des index en _read-only_
* passer des index en _write-only_
* bloquer la modification des _metadata_ des index : settings, mappings, alias...

===

#### Les blocks

Une valeur à `true` bloque l'opération.

* `index.blocks.read`
* `index.blocks.read-only`
* `index.blocks.read_only_allow_delete`
* `index.blocks.write`
* `index.blocks.metadata`

===

#### Définir un _index block_

```http request
PUT /starwars_characters/_settings
```
```json
{
  "settings": {
    "index.blocks.write": true
  }
}
```

---

## Réindexation, Split et Shrink

Certaines opérations nécessitent parfois de réindexer les données :

* changement de mapping
* grouper les données de plusieurs _index_ en 1

La réindexation copie les données d'un index _source_, vers un index _destination_.
La réindexation ne copie pas les _settings_ ou _mappings_, la destination doit être configurée à l'avance.

===

### Réindexer ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/docs-reindex.html))

```http request
POST _reindex
```
```json
{
  "source": {
    "index": "<index source>"
  },
  "dest": {
    "index": "<index destination>"
  }
}
```

===

### Réindexer plusieurs index

Si plusieurs index doivent être réindexés, Elasticsearch préconise de les faire un à la fois, pour faciliter la reprise en cas d'erreur.

===

### Réindexations partielles

Pour l'opération de réindexation, il est possible de passer en paramètre une `query`:

```http request
POST _reindex
```
```json
{
  "source": {
    "index": "dragonball_characters",
    "query": {
      "range": {
        "power_level": {
          "lte": 9000
        }
      }
    }
  },
  "dest": {
    "index": "weak_dragonball_characters"
  }
}
```

===

### Split & Shrink

Le _split_ consiste à copier un index dans un nouvel index avec *plus* de shards.

Le _shrink_ consiste à copier un index, dans un nouvel index avec *moins* de shards.

===

#### Pré-requis

Les _split_ et _shrink_ nécessitent que les index source soient *read-only*, pour éviter que des documents soient perdus pendant l'opération.

Les index doivent être `green`.

Le _shrink_ doit en plus avoir l'ensemble des shards localisés sur un même _node_.

===

#### Exécuter un _Split_ ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/indices-split-index.html))

##### Passer l'index en read-only

```http request
PUT /starwars_characters/_settings
```
```json
{
  "settings": {
    "index.blocks.write": true
  }
}
```

===

##### Splitter l'index

```http request
POST /starwars_characters/_split/starwars_characters-split
```
```json
{
  "settings": {
    "index.number_of_shards": 2
  }
}
```
```json
{
	"acknowledged": true,
	"shards_acknowledged": true,
	"index": "starwars_characters-split"
}
```

===

#### Exécuter un _Shrink_ ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/8.7/indices-shrink-index.html))

##### Passer l'index en read-only, et allouer tous les shards sur un seul node

```http request
PUT /starwars_characters/_settings
```
```json
{
  "settings": {
    "index.blocks.write": true,
    "index.number_of_replicas": 0,
    "index.routing.allocation.require._name": "<name>"
  }
}
```

===

##### Shrinker l'index

```http request
POST /starwars_characters/_shrink/starwars_characters-shrink
```
```json
{
  "settings": {
    "index.number_of_shards": 2
  }
}
```
```json
{
	"acknowledged": true,
	"shards_acknowledged": true,
	"index": "starwars_characters-shrink"
}
```

---

## TP Réindexation, Split & Shrink

![](assets/Coding-workshop.png)

===

### Sujet

Nous reprenons les index manipulés jusqu'à présent :

* pokemons_gen1
* pokemons_gen2

===

#### Réindexez

* Réindexez les deux index `pokemons_gen1` et `pokemons_gen2` en un seul index :
  * Qui porte votre nom
  * Qui possède un seul shard
* Faites un split de ce nouvel index vers un index qui possède `6` _shards_
* Faites un shrink de cet index splitté, vers un nouvel index qui possède `2` _shards_.

===

### Correction Réindexation, Split & Shrink

![](assets/Certification.png)

---

## C'est fini pour aujourd'hui !

![](assets/Successful-task-completed.png)
