var express = require('express');
var router = express.Router();
var redis = require('redis');
var client = redis.createClient('//redis:6379');

// https://stackoverflow.com/a/48293162
// https://stackoverflow.com/questions/16741476/redis-session-expiration-and-reverse-lookup/16747795#16747795
// client.send_command('config', ['set', 'notify-keyspace-events', 'Ex'], function(error, response) {
//   sub = redis.createClient('//redis:6379')
//   const expiredSubKey = '__keyevent@0__:expired'
//   sub.subscribe(expiredSubKey, function() {
//     console.log('Subscribed to "' + expiredSubKey + '" event channel : ' + response)
//     sub.on('message', function (chan, msg) { console.log('[expired]', msg) })
//   })
// })

const suggested = [
  { id: 0, name: 'Blue Potion', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 10.00, tags: ['Consumível', 'Azul'] },
  { id: 1, name: 'Red Potion', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 10.00, tags: ['Consumível', 'Vermelho'] },
  { id: 10, name: 'Produto legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['Legal'] },
  { id: 11, name: 'Produto legal', description: 'Um item muito interessante. Pode ser utilizado em qualquer situação, até mesmo quando você estiver em combate, muito recomendado. Apenas tome cuidado para não quebrar. Não aceito devoluções.', value: 55.99, tags: ['Legal'] },
];

const tagDescription = {
  'consumable': {id: 0, name: 'Consumível'},
  'equipament': {id: 1, name: 'Equipamento'},
  'blue':       {id: 2, name: 'Azul'},
  'red':        {id: 3, name: 'Vermelho'},
  'yellow':     {id: 4, name: 'Amarelo'},
  'green':      {id: 5, name: 'Verde'},
  'cool':       {id: 6, name: 'Legal'},
}

function convertTags(dbTags) {
  return dbTags.sort(function(tag1, tag2) { return tagDescription[tag1].id - tagDescription[tag2].id }).map(function(tag) { return tagDescription[tag].name; });
}

function getFrequentTags(frequency, callback) {
  client.smembers('user:tags', function(tagsError, tagsResult) {
    if (tagsError) {
      return callback(tagsError, null);
    }

    if (tagsResult.length > 0) {
      client.mget(tagsResult, function(freqError, freqResult) {
        if (freqError) {
          return callback(freqError, freqResult);
        }

        expireBatch = client.batch()
        frequentTags = []
        for (let i = 0; i < freqResult.length; ++i) {
          if (!freqResult[i]) {
            expireBatch.srem('user:tags', tagsResult[i]);
          } else if (freqResult[i] >= frequency) {
            frequentTags.push(tagsResult[i]);
          }
        }
        expireBatch.exec();

        return callback(freqError, frequentTags);
      });
    } else {
      return callback(tagsError, []);
    }
  });
}

function getProductsFromTags(quant, tags, callback) {
  if (tags.length <= 0) {
    return callback(null, []);
  }


  productBatch = client.batch();
  for (let i = 0; i < tags.length; ++i) {
    tag = tags[i].split(':');
    productBatch = productBatch.smembers(tag[1] + ':' + tag[2]);
  }
  productBatch.exec(function(error, result) {
    if (error) {
      return callback(error, null);
    }

    console.log(result);
    products = Array.from(new Set([].concat(...result)));
    if (quant > products.length) {
      quant = products.length;
    }
    for (let i = 0; i < quant; ++i)
    {
      const randIndex = Math.floor(Math.random() * (products.length - i) + i);
      const temp = products[randIndex];
      products[randIndex] = products[i];
      products[i] = temp;
    }
    console.log(products);

    const productsId = result.map(function(products) { return products[Math.floor(Math.random() * products.length)] })

    return getProductsById(products.slice(0, quant), callback);
  });
}

function getProductsById(ids, callback) {
  let batchProducts = client.batch();
  let batchTags = client.batch();
  for (let i = 0; i < ids.length; ++i) {
    batchProducts = batchProducts.hgetall('products:' + ids[i]);
    batchTags = batchTags.smembers('products:tags:' + ids[i]);
  }

  Promise.all([
    new Promise(function(resolve, reject) {
      batchProducts.exec(function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    }),
    new Promise(function(resolve, reject) {
      batchTags.exec(function(error, result) {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    }),
  ]).then(function(result) {
    let products = result[0];
    let tags = result[1];

    for (let i = 0; i < products.length; ++i) {
      products[i].value = parseFloat(products[i].value);
      products[i].tags = convertTags(tags[i]);
    }

    callback(null, products);
  }).catch(function(error) {
    callback(error, null);
  });
}

router.get('/', function(req, res, next) {
  getFrequentTags(10, function(tagsError, tagsResult) {
    if (tagsError) {
      console.log(tagsError);
      throw tagsError;
    }

    // TODO(andre:2018-12-01): Não utilizar a função keys()
    client.keys('products:[0-9]*', function(keysError, keysResult) {
      if (keysError) {
        console.log(keysError);
        throw keysError;
      }

      keysResult = keysResult.map(function(key) { return key.split(':')[1] }).sort(function(key1, key2) { return key1 - key2; });

      getProductsById(keysResult, function(productsError, productsResult) {
        if (productsError) {
          console.log(productsError);
          throw productsError;
        }

        getProductsFromTags(4, tagsResult, function(suggestedError, suggestedResult) {
          if (suggestedError) {
            console.log(suggestedError);
            throw suggestedError;
          }

          const debugInfo = tagsResult.map(function(tag) { return tagDescription[tag.split(':')[2]].name; })
          res.render('products', { title: 'Produtos', products: productsResult, suggested: suggestedResult, debug_label: 'Tags Frequentes: ', debug_info: debugInfo });
        });
      });
    });
  });
});

router.get('/:id', function(req, res, next) {
  getFrequentTags(10, function(tagsError, tagsResult) {
    if (tagsError) {
      console.log(tagsError);
      throw tagsError;
    }
    const id = req.params.id;

    client.batch()
      .hgetall('products:' + id)
      .smembers('products:tags:' + id)
      .exec(function (error, result) {
        if (error) {
          console.log(error);
          throw error;
        }

        let product = result[0];
        let tags = result[1];

        product.value = parseFloat(product.value);
        product.tags = convertTags(tags);

        let batch = client.batch();
        for (let i = 0; i < tags.length; ++i) {
          const tagKey = 'user:tags:' + tags[i];
          batch = batch.sadd('user:tags', tagKey);
          batch = batch.incr(tagKey);
          batch = batch.expire(tagKey, 600);
        }
        batch.exec();

        getProductsFromTags(4, tagsResult, function(suggestedError, suggestedResult) {
          if (suggestedError) {
            console.log(suggestedError);
            throw suggestedError;
          }

          const debugInfo = tagsResult.map(function(tag) { return tagDescription[tag.split(':')[2]].name; })
          res.render('product-details', { title: product.name, productDetail: product, suggested: suggestedResult, debug_label: 'Tags Frequentes: ', debug_info: debugInfo });
        });
      });
  });
});

module.exports = router;
