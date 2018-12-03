var express = require('express');
var router = express.Router();
var redis = require('redis');
var client = redis.createClient('//redis:6379');

router.get('/', function(req, res, next) {
  let products = [
    { id: 0, name: 'Blue Potion', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 10.00, tags: ['consumable', 'blue'] },
    { id: 1, name: 'Red Potion', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 10.00, tags: ['consumable', 'red'] },
    { id: 2, name: 'Green Potion', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 10.00, tags: ['consumable', 'green', 'cool'] },
    { id: 3, name: 'Yellow Potion', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 10.00, tags: ['consumable', 'yellow'] },
    { id: 10, name: 'Produto legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['cool'] },
    { id: 11, name: 'Poção legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['consumable', 'cool'] },
    { id: 12, name: 'Espada legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['equipament', 'cool'] },
    { id: 13, name: 'Escudo legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['equipament', 'cool'] },
    { id: 14, name: 'Capacete legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['equipament', 'cool'] },
    { id: 15, name: 'Bota legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['equipament', 'cool'] },
  ];

  batch = client.batch();

  batch = batch.flushall();

  for (let i = 0; i < products.length; ++i) {
    let product = products[i];
    batch = batch.sadd('products:tags:' + product.id, product.tags);

    for (let j = 0; j < product.tags.length; ++j) {
      batch = batch.sadd('tags:' + product.tags[j], product.id);
    }

    delete product.tags;
    batch = batch.hmset('products:' + product.id, product);
  }

  batch.exec(function (error, result) {
    if (error) {
      console.log(error);
      throw error;
    }

    console.log('Dados inseridos no banco');

    res.redirect('/');
  });
});

module.exports = router;
