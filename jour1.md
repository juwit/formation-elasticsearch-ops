# elasticsearch pour les ops

## Jour 1

---
## Objectifs de la journée

* Savoir ce qu'est _Elasticsearch_
* Connaitre ses cas d'usage
* Connaitre le vocabulaire associé
* Comprendre les architectures Elasticsearch
* Savoir _indexer_ et _requêter_ des documents


---
<!-- .slide: data-visibility="hidden" -->
## Plan
* Introduction à Elasticsearch
* Installation & configuration
* Indexer des documents, search
* Field Mappings

---
## Elasticsearch, c'est quoi ?
* Moteur de recherche
* Distribué
* API Rest
* Un écosystème

===

### Apache Lucene

Lucene est une bibliothèque Java.

Permet d'indexer et de rechercher des données.

Lucene fonctionne en local sur un seul nœud.

===

### Elasticsearch et Lucene

Elasticsearch s'appuie sur Lucene.

Mise à disposition sous forme de cluster.

Interface API / REST.

===

### Elasticsearch et Lucene

![](elasticsearch-elastic-lucenne.png) <!-- .element: class="r-stretch" -->

---

### Cas d'usage d'Elasticsearch

* Recherche "full-text" : recherche dans les applications web, portails, etc...
* Analyse de logs : agrégation de logs de sources multiples (serveurs/pods...), consultation et analyse
* Analyse de métriques : agrégation de métriques de sources multiples, consultation et analyse
* Recherche géospatiale : marketing geolocalisé, suivi de flotte, etc...
* Recherche de medias

---

## Scalabilité et résilience

Elasticsearch est scalable _horizontalement_.

On peut ajouter des _nœuds_ à un _cluster_ pour augmenter la taille de stockage disponible et répartir les traitements.

Le modèle de _sharding_ (_primaire_, _replica_) permet d'être résistant à la panne.

Elasticcsearch se charge de distribuer les données et les requêtes.

---

## La stack Elastic (_Elastic Stack_)

* _Elasticsearch_ : moteur d'indexation et de recherche
* _Kibana_ : Interface graphique de requêtage, exploration et configuration
* _Logstash_ : Ingestion de données, transformation
* _Beats_ : Agents de collecte de logs et métriques

_ELK_ = Ancien nom de l'_Elastic Stack_ : *E*lasticsearch + *L*ogstash + *K*ibana

===

![](elasticsearch-elastic-stack-roles.png) <!-- .element: class="r-stretch" -->

===

![](elasticsearch-elastic-stack-architecture.png) <!-- .element: class="r-stretch" -->

---

## Définitions & Vocabulaire

> Document :
>
> Unité de stockage dans Elasticsearch (un document _JSON_)

===

> Field/Champ :
>
> Une donnée _nommée_ et _typée_ dans un document (un attribut de document _JSON_).
> Les champs peuvent être de plusieurs types, _texte_, _nombre_, _date_,... 

===

> Index :
> 
> Unité logique de stockage. Contient des _documents_. Une structure optimisée pour la recherche de données.
> L'indexation d'un _document_ se fait dans un _index_.
> La recherche se fait dans un _index_.
> Les données d'un index sont similaires (les documents ont une structure similaire).

===

> Alias : 
> 
> Un nom secondaire pour un _index_ ou un groupe d'_index_.
> Permet de manipuler des noms constants. 
> 
> Exemples : 
> 
> `products` -> `products.2023.03`
> `logs-apache` -> `logs-apache-*`

===

> Query :
> 
> Une requête sur un _index_, un groupe d'_index_ (ex : `products-*`) ou un alias.
> 
> Une requête s'écrit en JSON.

===

> Mapping :
>
> La définition des _champs_ d'un _index_, nom et types. Utilisé pour définir comment les champs doivent être indexés et recherchés.

===

> Noeud :
>
> Une machine d'une cluster Elasticsearch.

===

> Cluster :
>
> Ensemble de nœuds travaillant ensemble pour stocker et traiter des _index_.

===

> Shard :
> 
> Partition d'un index. Unité physique de stockage.
> Un shard est stocké sur un _nœud_. Un document est présent dans un seul _shard_.
> Les _shard_ peuvent être répliqués pour assurer de la haute disponibilité. 

===

> Shards primaires et replicas:
>
> Un document est présent dans un shard _primaire_.
> Un shard _replica_ est une copie d'un shard _primaire_. 
> 
> Les shards _replica_ sont utilisés pour la redondance de données (perte de nœuds).
> Les shards _replica_ sont utilisés en lecture pour répondre à des requêtes.

---

## Indexation de documents

```http request
POST <index_name>/_doc/<id>
{
  // document
}
```

Le nom de l'index est *obligatoire*.

L'identifiant est *facultatif*.

===

### Exemples choisis :

```
POST starwars_characters/_doc/1
{
  "name": "Darth Vader",
  "species": "Human",
  "affiliation": "Galactic Empire",
  "quote": "Tu sous-estimes le pouvoir du côté obscur. Si tu refuses de te battre, tu devras affronter ton destin."
}
```
```json
{
  "_index": "starwars_characters",
  "_id": "1",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "_seq_no": 0,
  "_primary_term": 1
}
```

===

```http request
POST starwars_characters/_doc/2
{
  "name": "Luke Skywalker",
  "species": "Human",
  "affiliation": "Rebel Alliance",
  "quote": "Vous auriez dû négocier, Jabba. C’est la dernière erreur que vous commettez."
}
```
```json
{
  "_index": "starwars_characters",
  "_id": "2",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 1,
    "failed": 0
  },
  "_seq_no": 1,
  "_primary_term": 1
}
```

===

```http request
POST dragonball_characters/_doc
{
  "name": "Goku",
  "race": "Saiyan",
  "power_level": 9001,
  "favorite_technique": "Kamehameha"
}
```
```json
{
  "_index": "dragonball_characters",
  "_id": "rRbN5IYB1dofWQObFlRD",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "_seq_no": 0,
  "_primary_term": 1
}
```

===

```http request
POST dragonball_characters/_doc
{
  "name": "Vegeta",
  "race": "Saiyan",
  "power_level": 18000,
  "favorite_technique": "Galick Gun"
}
```
```json
{
  "_index": "dragonball_characters",
  "_id": "rhbN5IYB1dofWQObSlTJ",
  "_version": 1,
  "result": "created",
  "_shards": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "_seq_no": 1,
  "_primary_term": 1
}
```

---

## Requêter des documents - Query

Une requête est parsée, envoyée aux index concernés, exécutée par les _shards_. Les résultats sont scorés, puis aggrégés avant d'être reenvoyés.

Une requête est traitée dans un _shard_ par un seul thread, néanmoins, chaque _shard_ peut exécuter plusieurs threads en parallèle.

Le thread pool de traitement des requêtes est fixé à (((node.processors * 3) / 2) + 1). 2 CPU => 4 threads

===

### Recherche de tous les documents

```http request
GET starwars_characters/_search
```
```json
{
  "took": 0,
  "timed_out": false,
  "_shards": {
    "total": 1,
    "successful": 1,
    "skipped": 0,
    "failed": 0
  },
  "hits": {
    "total": {
      "value": 2,
      "relation": "eq"
    },
    "max_score": 1.0,
    "hits": [
      {
        "_index": "starwars_characters",
        "_id": "1",
        "_score": 1.0,
        "_source": {
          "name": "Darth Vader",
          "species": "Human",
          "affiliation": "Galactic Empire",
          "quote": "Tu sous-estimes le pouvoir du côté obscur. Si tu refuses de te battre, tu devras affronter ton destin."
        }
      },
      {
        "_index": "starwars_characters",
        "_id": "2",
        "_score": 1.0,
        "_source": {
          "name": "Luke Skywalker",
          "species": "Human",
          "affiliation": "Rebel Alliance",
          "quote": "Vous auriez dû négocier, Jabba. C’est la dernière erreur que vous commettez."
        }
      }
    ]
  }
}
```

===

### Recherche avec un query-string

```http request
GET starwars_characters/_search?q=Vader
```

===

### Recherche avec un query-string plus précis

```http request
GET starwars_characters/_search?q=name:Vader
```

===

### Recherche avec un body JSON

```http request
GET starwars_characters/_search
{
  "query": {
    "match": {
      "quote": "côté obscur"
    }
  }
}
```

---

## Mapping

> La définition des _champs_ d'un _index_, nom et types. Utilisé pour définir comment les champs doivent être indexés et recherchés.

2 méthodes:

* dynamic field mapping : automatique, facile, peu optimisé
* explicit mapping : manuel, optimisé, nécessite une bonne connaissance de la data

===

### Dynamic Field Mapping

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

### Les types de champs les plus courants

* `text` : recherches _full texte_ 
ex : `"Votre manque de foi me consterne."`
* `keyword` : recherche _exacte_ 
ex : `"Jedi"`, `"Sith"`
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
        "type": "text"
      },
      "species": {
        "type": "keyword"
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

### `text` vs `keyword`

Les données des champs `text` sont analysées pour être indexées en vue d'une recherche _full texte_ :

* tokenization : découpage du texte en tokens (mots)
* normalization : passage en minuscules, réduction des mots (singulier, infinitif)

===

#### Analyseurs de texte

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
        "analyzer": "french"
      },
      "species": {
        "type": "keyword"
      }
    }
  }
}
```

===

#### `keyword`

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

Document :

```json
{ "name": "Darth Vader" }
```

Query
```http request
GET starwars_characters/_search?q=name:Vader
// pas de résultat
```

```http request
GET starwars_characters/_search?q=name:Darth\ Vader
// un résultat !
```

---

## Fields, et mapping multiples

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

---

## Les propriétés d'un index

Les propriétés d'un index:

* `index.number_of_shards` : nombre de shards primaires. Positionné à la création. Ne peut pas être modifié. Valeur à `1` par défaut.
* `index.number_of_replicas`: nom de shards _replica_ pour chaque shard _primaire_. Peut être modifié. Valuer à `1` par défaut. Ne jamais positionner à `0` => risque de perte de données.



---

## Allocation des shards d'un index.

Dans un cluster hétérogène, on veut pouvoir contrôler l'allocation des shards.

---

## Getting index informations

Aliases, Mappings, Settings

```http request
GET starwars_characters
--
{
  "starwars_characters": {
    "aliases": {},
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
    },
    "settings": {
      "index": {
        "routing": {
          "allocation": {
            "include": {
              "_tier_preference": "data_content"
            }
          }
        },
        "number_of_shards": "1",
        "provided_name": "starwars_characters",
        "creation_date": "1678875502566",
        "number_of_replicas": "1",
        "uuid": "P904M3SVSk-ZlKbU2QuKmA",
        "version": {
          "created": "8060299"
        }
      }
    }
  }
}
```

---

## Les alias

Permettent de nommer des indexes, ou les regrouper sous un nom différent.

Les alias ne sont pas dynamiques (doivent être re-créés pour prendre en compte un nouvel index)

===

### Créer un alias

```http request
POST _aliases
{
  "actions": [
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

### Lister les alias présents dans un cluster

```http request
GET _alias
--
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

### Supprimer un alias dun ou plusieurs index

```http request
POST _aliases
--
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

### Mettre à jour un alias

Il faut le supprimer et le recréer, c'est fait dans une seule opération, sans downtime.

```http request


POST _aliases
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
