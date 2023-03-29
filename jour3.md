# elasticsearch pour les ops

## Jour 3

---

## Objectifs de la journée

* Les rôles d'un node
* Index Lifecycle Management
* Savoir dimensionner un cluster
* Savoir monitorer un cluster
* Savoir faire une maintenance des nodes
* Sauvegarde et Restauration
* Les API CAT
* Parcourir Elastic Cloud

---

## Les rôles d'un node

### Un cluster hétérogène

Des machines de type différentes, hardware différent, disques différents.

![](assets/elasticsearch-cluster-tiering.png)

===

### `node.roles: [ master ]`

Contrôle le cluster, suit les _node_, décide d'allouer des shards à des _node_.

Ces _node_ ne stockent que des données de metadata.

Préco Elasticsearch : des _node_ `master` dédiés à partir de 5 ou 6 _node_

=== 

### `node.roles: [ master, voting_only ]`

Participe aux votes pour l'élection d'un _node_ master.

Permet de limiter le nombre de _node_ `master` dédié, en permettant à un _node_ `data` de participer aux élections.

===

### `node.roles: [ data ]`

Stocker des données et traite des requêtes.

Fort besoins en CPU et RAM.

Possible de spécialiser avec une hiérarchisation (tiering).

===

#### `node.roles: [ data_content ]`

Données stables, qui ne doivent pas changer de _tier_.

Données qui doivent être requêtées rapidement, peu d'écritures, forts besoins en CPU pour avoir des perfs. 

Exemple : catalogue produit.

===

#### `node.roles: [ data_hot ]`

![](assets/elasticsearch-tiering.png)

Données stockées sur du hardware récent, I/O intensif (SSD)

Le point d'entrée d'écriture sur des données time-series, données récentes et fréquemment requêtées (qq jours).

===

#### `node.roles: [ data_warm ]`

![](assets/elasticsearch-tiering.png)

Données requêtées moins fréquemment, données des dernières semaines, sur du hardware un peu moins couteux.

Souvent, on n'indexe plus de nouvelles données dans des index `warm`.

===

#### `node.roles: [ data_cold ]`

![](assets/elasticsearch-tiering.png)

Données qui ne sont plus souvent requêtées, on optimise le cout de stockage, les données restent requêtables quand même, mais on accepte que les requêtes soient plus longues.

===

#### `node.roles: [ data_frozen ]`

![](assets/elasticsearch-tiering.png)

Données archivées sous la forme de snapshots, les données restent toujours requêtables, mais les requêtes sont très longues.

---

## Index Lifecycle Management (ILM)

Gestion de la vie des index :

* rotation automatique (taille / nb de documents / daily )
* déplacement de classe de stockage (hot / warm / cold / frozen)
* suppression de données

===

### Phases

ILM définit des _phases_ :

![](assets/elasticsearch-ilm-phases.png)

Une _policy_ définit les _phases_ à utiliser, quelles actions faire dans chaque _phase_, et les transitions entre les phases.

Les transitions entre les phases sont temporelles (en jours).

===

### Actions

Dans chaque _phase_, ILM peut :

* faire des rotations sur un critère : `max_age`, `max_docs`, `max_size`
* passer des index en `read-only`
* changer le nombre de replicas
* migrer les données dans une `data tier`
* faire un `shrink` sur les index
* Supprimer les index


===

### Actions & Phases

Toutes les phases ne supportent pas toutes les actions :

* une action `read-only` en phase `hot` n'a pas de sens
* une action `delete` ne se fait qu'en phase `delete`

===

### Création d'une policy dans Kibana

![](assets/elasticsearch-kibana-create-policy.png)

===

### Création d'une policy en REST

```http request
PUT _ilm/policy/<my_policy>
```
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover" : {
            "max_size": "100gb"
          }
        }
      },
      "warm": {
        "min_age": "10d",
        "actions": {
          "allocate": {
            "number_of_replicas": 1
          },
          "readonly": {}
        }
      },
      "delete": {
        "min_age": "30d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

---

## Maintenance des nodes

Préparation au shutdown

```http request
PUT _nodes/<node-id>/shutdown
```
```json
{
  "type": <type>
}
```

Les types peuvent être `restart`, `remove`, `replace`.

===

### Restart

`restart` : les shards ne seront pas réalloués pendant le redémarrage.

```http request
PUT _nodes/<node-id>/shutdown
```
```json
{
  "type": "restart",
  // délai à attendre avant de quand même réallouer les shards
  "allocation_delay": "20m" 
}
```

===

### Remove

`remove` : tous les shards seront réalloués avant que le _node_ ne soit marqué prêt.

```http request
PUT _nodes/<node-id>/shutdown
```
```json
{
  "type": "remove"
}
```

Jouer un GET pour savoir quand toutes les réallocations ont été faites

```http request
GET _nodes/<node-id>/shutdown
```
```json
{
  "status": "COMPLETE",
  "shard_migration": {
    "status": "COMPLETE",
    "shard_migrations_remaining": 0,
    "explanation": "no shard relocation is necessary for a node restart"
  },
}
```

===

### Replace

`replace` : tous les shards du _node_ seront réalloués vers le node `target`.

```http request
PUT _nodes/<node-id>/shutdown
```
```json
{
  "type": "remove",
  "target_node_name": "<name>"
}
```

Jouer un GET pour savoir quand toutes les réallocations ont été faites

```http request
GET _nodes/<node-id>/shutdown
```
```json
{
  "status": "COMPLETE",
  "shard_migration": {
    "status": "COMPLETE",
    "shard_migrations_remaining": 0,
    "explanation": "no shard relocation is necessary for a node restart"
  },
}
```
