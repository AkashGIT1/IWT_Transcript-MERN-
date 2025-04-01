const mongo=require('mongodb');

const MongoClient = mongo.MongoClient;

const uri="mongodb://localhost:27017/nitk_transcripts"

const mongoConnect =(callback)=>{MongoClient.connect(uri).then(client=>{
    console.log(client);
    callback(client);
}).catch(err=>{
    console.log("Error while connecting");
});

};

module.exports = mongoConnect;

