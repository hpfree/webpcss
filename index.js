'use strict';
exports.webpcss = function(){
  
  
};
/**
 * usewebp.js
 *
 * Release 1.2.0
 * @author <a href="">Huang Ping</a>
 * @describe  转化图片成webp格式，同时自动替换css中已存在的引用图片的样式，(PS)webp最终实现依赖于modernizr.js。需要在页面中引入
 */

var fs = require("fs"),
gulp = require('gulp'),
del = require('del'),
imageminWebp = require('imagemin-webp');

/**
 * 控制流/同步
 * @param {Array} arr
 * @param {Function} callback1 传递两个参数 (item,next)，执行完一项则需执行next()才能执行下一项
 * @param {Function} callback2 出错或执行完时回调
 * @returns {*}
 */
//js异步仿同步（控制流）的实现
function async(arr,callback1,callback2){
  if(Object.prototype.toString.call(arr)!='[object Array]'){
    return callback2(new Error('第一个参数必须为数组'));
  }
  if(arr.length===0){
    return callback2(null);
  }
  (function walk(i){
    if(i>=arr.length){
      return callback2(null);
    }
    callback1(arr[i],function(){
      walk(++i);
    });
  })(0)
};

//遍历文件夹下所有文件，输出所有子文件路径
function getAllFiles (dir,callback){
  var filesArr = [];
  (function checkdir(dirPath,fn){
    var files = fs.readdirSync(dirPath);
    async(files,function(item,next){
      var info  = fs.statSync(dirPath + item);
      if(info.isDirectory()){
        checkdir(dirPath + item + "/",function(){
          next();
        });
      }else{
        filesArr.push(dirPath + item);
        callback && callback(dirPath + item);
        next();
      }
    },function(err){
      !err && fn &&fn();
    });
  })(dir);
  return filesArr;
};

//对象转换成数组
function objChangeArr(obj){
  var arrImage = [];
  for(var attr in obj){
    arrImage.push(obj[attr]);
  }
  return arrImage;
};

//流程
//1是匹配到所有css中正在引用的图片，先保存在对象中，再转化成数组，保存到数组中，转化成webp格式，
//2是正则修改替换插入.webp的css;
//3把内容写入回原来的文件中；
function readFiles(filePaths,callback){
  var usedImageArr = {};
  var filePathsLen = filePaths.length;
  for(var i = 0 ,n = filePaths.length ; i<n ; i++){
    (function(fileName){
      var fileData = "";
      fs.readFile(fileName,"utf-8",function(err,data){
        if(err){
        }else{
          fileData = data;
          var delwebpSentenceRed = /(html[\.\S]*|\.backgroundsize)?.webp[^\}]*\}/;
          fileData = fileData.replace(delwebpSentenceRed,function(){
            return "";
          })
          //找到带有背景图片的css语句;
          // var searchImgReg = /[^(\}|\{|\/)]*\{[^\}]*url\(([^\}]*[png|jpg|ico])\)[^\}]*\}/gi;
          var searchImgReg = /[^(\}|\{|\/)]*\{[^\}]*url\(([^\}]*(images\/[^\}]*[png|jpg|ico]))\)[^\}]*\}/gi;
          fileData = fileData.replace(searchImgReg,function(){
            // //保存图片的路径；
             var imageUrl = arguments[2];
            //图片在当前css中的引用路径
            var webImageUrl = arguments[1];
            //匹配到包含图片需要被处理的css语句
            var needReplaceCss = arguments[0];
            //把图片后缀转换成.webp。
            webpImageUrl = webImageUrl.replace(/\.png|\.jpg|\.ico/,".webp");

            //保存css中引用的图片路径，给转换图片格式使用；
            if(!usedImageArr[imageUrl]){
              usedImageArr[imageUrl] = imageUrl;
            }
            //webpCss写入webp格式图片的兼容代码，替换原来的的样式；把“｛ ｝”里面的内容替换掉，变成{background-image:url()}的格式；
            var webpCss = needReplaceCss.replace(/(\{(.|\n|\r|\n\r)*\})/,function(){
              return "{background-image:url("+webpImageUrl+")}"
            })

            //添加.webp前缀兼容

           // 0、前缀是以html(.｜ )(样式名称)开始，需要替换成html.(webp);
            var hashtmlReg = /(html[\.\S]*)\s/g;
            webpCss = webpCss.replace(hashtmlReg,function(){
              return arguments[1]?arguments[1]+".webp ":" ";
            })

            //1、如果是以.backgroudsize开头的 添加.webp没有空格
            webpCss = webpCss.replace(/([^html]\.backgroundsize)/g,function(){                  
              return arguments[1]?arguments[1]+".webp":" ";
            });

            //2、有一个规则对应多个样式表的情况，中间以","分割，","号后面不已“html”开始的也需要添加.webp
            webpCss = webpCss.replace(/\,(?!(\s*html|\s*\.backgroundsize))/g,function(){                  
              return ",.webp ";
            });

            //3、除去   屏幕兼容@media only screen and (max-width:800px){、或者是html 开头的添加 .webp前缀
            webpCss = webpCss.replace(/^\{*([(\n|\r|\n\r)])*(?!(\s*html|\s*\.backgroundsize|\\))/,function(){
              return arguments[1]+".webp ";
            });

            // 3如果是带有.backgroundsize开头的添加".webp"没有空格
            return needReplaceCss+webpCss;
          })
        }
        fs.writeFile(fileName,fileData); 
        filePathsLen = filePathsLen-1;
       // console.log(filePathsLen);
        if(filePathsLen == 0){
          usedImageArr  = objChangeArr(usedImageArr);
          callback(usedImageArr);
        };
      })
    })(filePaths[i]);
  }
};


var filePaths = getAllFiles("styles/");
//读取文件内容进行相关修改；
readFiles(filePaths,function(imgSrcs){
  //转化webp格式图片
  return  gulp.src(imgSrcs,{base:'images'})
  .pipe(imageminWebp({quality: 50})())
  .pipe(gulp.dest('images/'));
});




