//全局变量
var UrlPrefix = "http://video.skygrande.com/static";
var PerPageNum = 20;
var ServerAddr = "flushserver.tool.cloudiya.com:3000";

//等待刷新列表初始化
WaitFlushList(0);
//正在刷新列表初始化
FlushingList();

//生成随机数
var randomnum = getRandom(999);

$(document).ready(function(){ 
            
            //点击刷新CDN按钮动作
            // ----------------------------------------------------------------
            $("#FlushCDN").click(function(){
                             var textarea_array = ($("#urls").val()).split("\n");
                             var urlstype = $('input[name="urlstype"]').filter(":checked").val();
                             FlushCDN(textarea_array,urlstype);
            });
            //----------------------------------------------------------------------
            
            //点击刷新squid按钮动作
            //----------------------------------------------------------------------
            $("#FlushSquid").click(function(){
                               //传递url给后端shell脚本执行刷新squid
                               
                               var textarea_array = ($("#urls").val()).split("\n");
                               var urlstype = $('input[name="urlstype"]').filter(":checked").val();
                              
                               $("#ShowSquid pre").text(""); 
                               FlushSquid(textarea_array,urlstype);
            });
            //-----------------------------------------------------------------------
            
            
            //点击导航栏Cache Flush链接
            //-----------------------------------------------------------------------
            $("#CacheFlushNav").click(function(){
                                  $("#CacheFlushingDiv").hide();
                                  $("#CacheFlushDiv").show();          
            });
            
            //点击导航栏Cache Flushing链接
            $("#CacheFlushingNav").click(function(){
                                  $("#CacheFlushDiv").hide();
                                  $("#CacheFlushingDiv").show();          
            });
            //-------------------------------------------------------------------------
            
            //点击check按钮
            //-------------------------------------------------------------------------
            $("tr#check").live("click",function(){
                                  var rid  = $(this).attr("val");
                                  $.getJSON("http://"+ServerAddr+"/check?format=json&jsoncallback=?","rids="+rid,function(data,status){
                                           if (data.head == "fail")
                                              {
                                                 alert(data.body);
                                              }
                                           else
                                              {
                                                 var DataArray = eval(data.body);
                                                 for (i in DataArray)
                                                    {
                                                       var rid = DataArray[i]["rid"];
                                                       var status = DataArray[i]["status"];
                                                       var endtime = DataArray[i]["endtime"];
                                                       
                                                       if (status == "ok")
                                                          {
                                                             $("tr[val="+rid+"]").attr("class","success");
                                                             $("tr[val="+rid+"]").find("#status").text(endtime);
                                                          }
                                                    }                                                  
                                              }          
                                  });
            });
            //-------------------------------------------------------------------------
            
            //点击待刷新url列表下刷新CDN按钮
            //-------------------------------------------------------------------------
            $("#WaitFlushCDN").click(function(){
                               
                               tmpurls = "";
                               $("input#WaitFlushUrl").filter("[checked]").each(function(){
                                             tmpstr = UrlPrefix + $(this).attr("value");
                                             tmpurls = tmpurls + tmpstr + ","
                               });
                               
                               tmpurls = tmpurls.substr(0,tmpurls.length-1);
                               urlstype = $('input[name="urlstype"]').filter(":checked").val();
                               FlushCDN(tmpurls,urlstype);
                               WaitFlushList(0);

            });
            //-------------------------------------------------------------------------
            
            //点击待刷新url列表下刷新Squid按钮
            //-------------------------------------------------------------------------
            $("#WaitFlushSquid").click(function(){
            
                               tmpurls = "";
                               $("input#WaitFlushUrl").filter("[checked]").each(function(){
                                             tmpstr = UrlPrefix + $(this).attr("value");
                                             tmpurls = tmpurls + tmpstr + ","
                               });
                               
                               tmpurls = tmpurls.substr(0,tmpurls.length-1);
                               urlstype = $('input[name="urlstype"]').filter(":checked").val();
 
                               $("#ShowSquid pre").text("");
                               FlushSquid(tmpurls,urlstype);
                               
            });
            //-------------------------------------------------------------------------
            
            //点击定时刷新开按钮
            $("#IntChkOn").click(function(){
            
                           //开启定时刷新
						   IntChkObj=setInterval("BatchCheck()",1000);
						   $(this).attr('disabled',"true");
						   $("#IntChkOff").removeAttr("disabled");

            });
            
            //点击定时刷新关按钮
            $("#IntChkOff").click(function(){
               
                           //开闭定时刷新
                           clearInterval(IntChkObj);
						   $(this).attr('disabled',"true");                          
                           $("#IntChkOn").removeAttr("disabled");
            });
            
            //点击等待刷新列表下一页按钮
            $("#NextPage").click(function(){
                 SP = $("#PositionVal").attr("val");
                 SP = new Number(SP);
                 SP = SP + PerPageNum;
                 WaitFlushList(SP);
            });
            
            //点击等待刷新列表上一页按钮
            $("#PrePage").click(function(){
                 SP = $("#PositionVal").attr("val");
                 SP = new Number(SP);
                 SP = SP - PerPageNum;
                 WaitFlushList(SP);
            });
            
                        
});

//刷新Squid
//-------------------------------------------------------------
function FlushSquid(urls,urlstype){
           
           $.getJSON("http://"+ServerAddr+"/flushsquid?format=json&jsoncallback=?","urls="+urls+"&urlstype="+urlstype+"&key="+randomnum,function(data,status){
                 if (data.success == "1")
                      {
                          //disabled该按钮
                          $(".FlushSquid").attr('disabled',"true");

                          $("#ShowSquid").slideDown("slow");
  
                          //脚本已开始执行,调用函数写终端输出到前端页面
                          WriteStdoutToFront();
                      }    
                  else
                      {
                          //脚本执行错误,弹出错误信息.
                          alert(data.text);
                      }
           });
}
//--------------------------------------------------------------

//刷新CDN
//--------------------------------------------------------------
function FlushCDN(urls,urlstype){
             $.getJSON("http://"+ServerAddr+"/flushcdn?format=json&jsoncallback=?","urls="+urls+"&urlstype="+urlstype,function(data,status){
                   
                   if (data.head == "fail")
                      {
                         alert(data.body);
                      }
                   else
                      {
                         $("#CacheFlushDiv").hide();
                         $("#CacheFlushingDiv").show();
                         
                         var DataArray = eval(data.body);
                         for (i in DataArray)
                           {
                              $.each(DataArray[i],function(url,id){
                                    WriteFlushingTable(url,id);
                              });
 
                           } 
                      }
                       
             });
}
//----------------------------------------------------------------

//批量检查刷新结果
//--------------------------------------------------------
function BatchCheck(){
          var rids = "";
          
          $("tr#check").each(function(){
                  rid = $(this).attr("val");
                  //rids += rid+",";
                  rids = rids + rid + ",";  
          });
          
          rids = rids.substr(0,rids.length-1);
          
	      $.getJSON("http://"+ServerAddr+"/check?format=json&jsoncallback=?","rids="+rids,function(data,status){
	               if (data.head == "fail")
	                  {
	                     alert(data.body);
	                  }
	               else
	                  {
	                     var DataArray = eval(data.body);
	                     for (i in DataArray)
	                        {
	                           var rid = DataArray[i]["rid"];
	                           var status = DataArray[i]["status"];
	                           var endtime = DataArray[i]["endtime"];
	                           
	                           if (status == "ok")
	                              {
	                                 $("tr[val="+rid+"]").attr("class","success");
	                                 $("tr[val="+rid+"]").find("#status").text(endtime);
	                              }
	                        }                                                  
	                  }          
	      });	      
}
//--------------------------------------------------------

//显示正在刷新的URL
//---------------------------------------------------------
function WriteFlushingTable(url,id){
         $("#CacheFlushingDiv table tbody").html(function(i,origHtml){
                  return "<tr class='error' id='check' val="+id+"><td>"+id+"</td><td>"+url+"</td><td id='status'>Running</td><td><a  href='#' >Check</a></td></tr>" + origHtml;
         });
}
//----------------------------------------------------------

//列正在刷新表
//----------------------------------------------------------
function FlushingList(){
         $.getJSON("http://"+ServerAddr+"/flushinglist?format=json&jsoncallback=?",function(data,status){                      
                      $.each(data,function(id,value){
                      	valuejson = eval('('+value+')'); 
                        $.each(valuejson,function(id,url){
                             WriteFlushingTable(url,id); 
                         });                      	
                      });                     
         });
}
//----------------------------------------------------------


//列待刷新表
//----------------------------------------------------------
function WaitFlushList(StartPosition){
         
         $("#WaitFlushDiv table tbody").html("");
         
         $.getJSON("http://"+ServerAddr+"/waitflushlist?format=json&jsoncallback=?","ppn="+PerPageNum+"&sp="+StartPosition,function(data,status){         
                      urls = data.urlsdata;
                      //本次取回的url数目 
                      UrlsNum = urls.length;
                      //后端保存的url总数目
                      UrlSum = data.urlsum;
                      
                      if (StartPosition+PerPageNum > UrlSum)
                         {
                            //禁用下一页按钮
                           $("#NextPage").attr('disabled',"true");
						   
                         }
                      else
                         {
                            //启用下一页按钮
                            $("#NextPage").removeAttr("disabled");
                         }
                         
                     if (StartPosition-PerPageNum < 0)
                         {
                            //禁用上一页按钮
                            $("#PrePage").attr('disabled',"true");
                         }
                      else
                         {
                            //启用上一页按钮
                            $("#PrePage").removeAttr("disabled");
                         }
                      
                      for (i in urls)
                         {
                             i = UrlsNum-1-i;
                             id = i + StartPosition;
                             url = urls[i];
                             
					         $("#WaitFlushDiv table tbody").html(function(n,origHtml){
					                  return "<tr class='error'><td><label class='checkbox'><input id='WaitFlushUrl' type='checkbox' value="+url+"></label></td><td>"+id+"</td><td>"+UrlPrefix+url+"</td></tr>"+origHtml;
					         });
                         }
                                                             
         });
         
         //重置页面开始位置值
         $("#PositionVal").attr("val",StartPosition);
         
}
//----------------------------------------------------------

//写终端输出到前端页面
//----------------------------------------------------------
function WriteStdoutToFront(){
		  $.ajax({
		          type:"GET",
		          dataType:"jsonp",
		          url:"http://"+ServerAddr+"/getstdout?jsoncallback=?",
		          timeout:246000,   //ajax请求超时80秒
		          //data:{time:"80"}, //40秒后无论结果服务器都返回数据
		          data:{key:randomnum},
		          success:function(data,textStatus) {
		                    //从服务器得到数据，显示数据并继续查询.
		                   if (data.success == '1'){
		                             $("#ShowSquid pre").append("<br>"+data.text);
		                             WriteStdoutToFront();
		                    }
		                    
		                    //未从服务器得到数据,继续查询.
		                   if (data.success == "0") {
		                             $(".FlushSquid").removeAttr("disabled");
		                             $("#ShowSquid pre").append("<br>[COMPLETE]");
		                             //WriteStdoutToFront();
		                    }
		                    
		          },
		          
		          //Ajax请求超时,继续查询.
		          error:function(XMLHttpRequest,textStatus,errorThrown) {
		                      if (textStatus == "timeout") {
                                              $(".FlushSquid").removeAttr("disabled");
		                              $("#ShowSquid pre").append("<br>[TIMEOUT]");
		                              //WriteStdoutToFront();
		                      }
		          },
		   });
}
//-----------------------------------------------------------------------

//随机数函数
//-----------------------------------------------------------------------
function getRandom(n){return Math.floor(Math.random()*n+1)}
//-----------------------------------------------------------------------
