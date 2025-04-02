
const mongoose=require('mongoose')

mongoose.connect('mongodb://127.0.0.1:27017/cgpa')

const userschema=mongoose.Schema({
    name:String,
    fname:String,
    rollno:Number,
    course:String,
    sub:[{
        subject:{type:String},
        marks:{type:Number,default:0},
    }]
})

module.exports=mongoose.model('user',userschema); 