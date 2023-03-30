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
* Bonnes pratiques d'installation

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

## Sauvegarde et Restauration

Pas besoin de sauvegarder le filesystem des _nodes_.

Il vaut mieux utiliser des Snapshots (équivalent d'un dump).

===

### Snapshot repositories

un _repository_ permet de stocker des _snapshot_ ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshots-register-repository.html)).

Implémentations disponibles :

* AWS S3
* Google Cloud Storage (GCS)
* Azure Blob Storage
* Shared File System (NFS)

===

### Un snapshot

* Peut contenir un ou plusieurs _index_
* Contiendra les _mapping_, _settings_, et _alias_ des index sauvegardés
* Peut contenir le `state` du cluster (ILM policies, index templates)

===

### Créer un _snapshot_ manuellement ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/create-snapshot-api.html))

```http request
PUT /_snapshot/<repository>/<snapshot name>
```
```json
{
  "indices": ["starwars_characters", "dragonball_characters"],
  "metadata": { // optionnel
    "taken_by": "Julien",
    "taken_because": "Test Snapshot"
  }
}
```

===

### Sauvegarder le state du cluster ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/create-snapshot-api.html))

```http request
PUT /_snapshot/<repository>/<snapshot name>
```
```json
{
  "include_global_state": true
}
```

===

### Suivre le statut d'un _snapshot_ ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/get-snapshot-status-api.html))

```http request
GET _snapshot/<repository>/<snapshot_name>/_status
```
```json
{
  "snapshots": [
    {
      "snapshot": "manual_snapshot",
      "uuid": "G0Ej1bfqRMC8tCxq8PjUJg",
      "repository": "found-snapshots",
      "version_id": 8060299,
      "version": "8.6.2",
      "indices": [
        "dragonball_characters",
        "starwars_characters"
      ],
      "data_streams": [],
      "include_global_state": false,
      "metadata": {
        "taken_by": "Julien",
        "taken_because": "Test Snapshot"
      },
      "state": "SUCCESS",
      "start_time": "2023-03-29T17:50:44.351Z",
      "start_time_in_millis": 1680112244351,
      "end_time": "2023-03-29T17:50:45.952Z",
      "end_time_in_millis": 1680112245952,
      "duration_in_millis": 1601,
      "failures": [],
      "shards": {
        "total": 2,
        "failed": 0,
        "successful": 2
      },
      "feature_states": []
    }
  ],
  "total": 1,
  "remaining": 0
}
```

===

### Restaurer un _snapshot_

On peut restaurer partiellement un _snapshot_ (un ou plusieurs _index_)

```http request
POST _snapshot/<repository>/<snapshot_name>/_restore
```
```json
{
  "indices": ["starwars_characters"]
}
```

===

### Supprimer un _snapshot_

```http request
DELETE _snapshot/<repository>/<snapshot_name>/_restore
```

===

### Snapshot Lifecycle Management (SLM)

Création automatique de snapshots.

===

#### Créer une policy SLM

```http request
PUT _slm/policy/<name>
```
```json
{
  "schedule": "0 30 1 * * *", // cron
  "name": "nightly-snapshot", 
  "repository": "my_repository",    
  "config": {
    "indices": "dragonball_characters"
  },
  "retention": {                    
    "expire_after": "30d",
    "min_count": 5,
    "max_count": 50
  }
}
```

===

### Supprimer une policy

```http request
DELETE _slm/policy/<name>
```

Supprimer une policy ne supprime pas les snapshots créés.

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

---

## Bonnes pratiques d'installation

* Elasticsearch doit être le seul service qui tourne sur une machine (VM ou bare-metal)
* Pas besoin de swap (la JVM consommera uniquement de la RAM)
* Utiliser un user *nix `elasticsearch` dédié


===

### Let the JVM be

Laisser Elasticsearch allouer la mémoire de la machine pour la JVM.

Paramètres proposés : 

* Utiliser la JVM packagée avec Elasticsearch ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/setup.html#jvm-version))
* `-Xms` = `-Xmx` : pour tout de suite allouer la RAM nécessaire 
  * Positionner la valeur à 50% de la RAM disponible sur la VM ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/advanced-configuration.html#set-jvm-heap-size))
* Utiliser le G1GC : `-XX:+UseG1GC`

===

### Paramètres systèmes utiles

===

#### File Descriptors

ElasticSearch utilise beaucoup de file descriptors, nombre recommandé > `65535` ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/file-descriptors.html))

Configuration :
```bash
# /etc/security/limits.conf
elasticsearch - nofile 65535
# ou
root - nofile 65535
```

===

#### Taille maximale d'un fichier
 
Elasticsearch va créer de gros fichiers pour chaque shared (plusieurs giga octets).

La taille max des fichiers ne doit pas être limitée.

Configuration :

```bash
# /etc/security/limits.conf
elasticsearch - fsize unlimited
# ou
root - fsize unlimited
```

===

#### Mémoire virtuelle

ElasticSearch & Lucene utilise un filesystem `mmapfs` ou `hybridfs`, pour mapper les fichiers lucene disque en mémoire vive ([doc 1](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules-store.html#file-system), [doc 2](https://www.elastic.co/guide/en/elasticsearch/reference/current/vm-max-map-count.html))

Préco de positionnement à `262144` :

```bash
echo vm.max_map_count=262144 | tee /etc/sysctl.d/99-mmap.conf
```

===

#### Address Space

Elasticsearch utilise mmap (voir point précédent).

La taille de mémoire virtuelle (address space) d'adresses doit être illimité.

Configuration :

```bash
# /etc/security/limits.conf
elasticsearch - as unlimited
# ou
root - as unlimited
```

===

#### Nombre de process

Elasticsearch utilise des threads pour traiter des requêtes, déplacer des données, etc...

La valeur recommandée est un minimum à `4096`. ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/max-number-of-threads.html))

Configuration :

```bash
# /etc/security/limits.con
elasticsearch - nproc 4096
# ou
root - nproc 4096
```

===

#### Cache DNS de la JVM

Si les noms DNS sont amenés à changer, attention au cache de la JVM.

Elasticsearch utilise un security manager dans la JVM
La configuration par défaut d'Elasticsearch cache les résolutions réussies pendant 60 secondes et les résolutions ratées pendant 10 secondes. ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/networkaddress-cache-ttl.html))

===

#### Retry TCP ([doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/system-config-tcpretries.html))

Si un _node_ ne peut pas être joint, des retransmissions de paquets auront lieu
* par défaut dans Linux, `15` retransmissions avec backoff, soit `900` secondes avant timeout
* elasticsearch recommande `5` retransmissions, pour détecter plus finement les node failures en `6` secondes

Configuration :
```bash
echo net.ipv4.tcp_retries2=5 | tee /etc/sysctl.d/99-tcp_retries2.conf
```

===

#### Filesystem `/tmp` exécutable

Elasticsearch utilise du code natif (JNA - Java Native Access)

* ce code est extrait à l'exécution dans le répertoire temporaire `/tmp` pour être exécuté
* il ne faut pas de flag `noexec` sur le point de montage `/tmp`
* ou changer de répertoire avec la variable d'env `ES_TMPDIR`

Configuration :

```bash
# exemple
export ES_TMPDIR=/usr/share/elasticsearch/tmp

# utilisé dans:
# config/jvm.options
-Djava.io.tmpdir=${ES_TMPDIR}
```

---

## Cluster Health

La santé du cluster est disponible à travers une API :

```http request
GET /_cluster/health
```
```json
{
  "cluster_name": "54e949dcc17043dabbd8f20fa3fb67e7",
  "status": "yellow",
  "timed_out": false,
  "number_of_nodes": 1,
  "number_of_data_nodes": 1,
  "active_primary_shards": 16,
  "active_shards": 16,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 2,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 88.88888888888889
}
```

===

### Cluster Health Level

Il est aussi possible de récupérer des détails au niveau des index ou des shards :

```http request
GET /_cluster/health?level=indices

GET /_cluster/health?level=shards
```
```json
{
  "cluster_name": "54e949dcc17043dabbd8f20fa3fb67e7",
  "indices": {
    "pokemons_gen1": {
      "status": "yellow",
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "active_primary_shards": 1,
      "active_shards": 1,
      "relocating_shards": 0,
      "initializing_shards": 0,
      "unassigned_shards": 1,
      "shards": {
        "0": {
          "status": "yellow",
          "primary_active": true,
          "active_shards": 1,
          "relocating_shards": 0,
          "initializing_shards": 0,
          "unassigned_shards": 1
        }
      }
    },
    "pokemons_gen2": {
      "status": "yellow",
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "active_primary_shards": 1,
      "active_shards": 1,
      "relocating_shards": 0,
      "initializing_shards": 0,
      "unassigned_shards": 1,
      "shards": {
        "0": {
          "status": "yellow",
          "primary_active": true,
          "active_shards": 1,
          "relocating_shards": 0,
          "initializing_shards": 0,
          "unassigned_shards": 1
        }
      }
    }
  }
}
```

---

## Les API CAT (Compact & Aligned Text)

Les API `_cat` sont destinées aux humains, pour la récupération d'infos sur les clusters.

Pratique depuis un browser, ou depuis un shell en `curl`.

===

### Paramètres

* `v` : mode verbose (entêtes)
* `h` : filtrer les colonnes
* `format` : `text`, `json`, `yaml`
* `sort` : tri

===

### `_cat/health`

Santé du cluster

```http request
GET _cat/health
```
```text
epoch      timestamp cluster                          status node.total node.data shards pri relo init unassign pending_tasks max_task_wait_time active_shards_percent
1680185251 14:07:31  54e949dcc17043dabbd8f20fa3fb67e7 yellow          1         1     26  26    0    0       12             0                  -                 68.4%
```

===

### `_cat/indices`

Liste des index avec leurs détails

```http request
GET _cat/indices
```
```text
health status index         uuid                   pri rep docs.count docs.deleted store.size pri.store.size
yellow open   pokemons_gen1 Ox63zh_PRq-abU7xNm6VOQ   1   1        151            0     46.9kb         46.9kb
yellow open   pokemons_gen2 V4V7pF9gTgmdtw95oJHrwA   1   1        100            0     95.3kb         95.3kb
```

===

### `_cat/shards`

Liste des _shards_ (tous, ou ceux d'un index)

```http request
GET _cat/shards/pokemons_*
```
```text
index         shard prirep state      docs  store ip            node
pokemons_gen1 0     p      STARTED     151 46.9kb 10.43.255.116 instance-0000000000
pokemons_gen1 0     r      UNASSIGNED
pokemons_gen2 0     p      STARTED     100 95.3kb 10.43.255.116 instance-0000000000
pokemons_gen2 0     r      UNASSIGNED
```

===

### `_cat/nodes`

Liste des _node_

```http request
GET _cat/nodes
```
```text
ip            heap.percent ram.percent cpu load_1m load_5m load_15m node.role master name
10.43.255.116           53          98   0    2.52    2.85     3.09 himrst    *      instance-0000000000
```

===

### `_cat/nodeattrs`

Liste des attributs de nodes (role et custom)

```http request
GET _cat/nodeattrs
```
```text
node                host          ip            attr                      value
instance-0000000000 10.43.255.116 10.43.255.116 logical_availability_zone zone-0
instance-0000000000 10.43.255.116 10.43.255.116 xpack.installed           true
instance-0000000000 10.43.255.116 10.43.255.116 data                      hot
instance-0000000000 10.43.255.116 10.43.255.116 server_name               instance-0000000000.54e949dcc17043dabbd8f20fa3fb67e7
instance-0000000000 10.43.255.116 10.43.255.116 instance_configuration    gcp.es.datahot.n2.68x16x45
instance-0000000000 10.43.255.116 10.43.255.116 region                    unknown-region
instance-0000000000 10.43.255.116 10.43.255.116 availability_zone         europe-west1-b
```
