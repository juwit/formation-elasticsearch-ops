# elasticsearch pour les ops

## Jour 2

---

## Objectifs de la journée

* Savoir dimensionner un cluster
* Savoir monitorer un cluster
* Savoir faire une maintenance des nodes
* Sauvegarde et Restauration
* Lifecycle Management
* Les API CAT
* Parcourir Elastic Cloud

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
