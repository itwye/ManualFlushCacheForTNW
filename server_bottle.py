#!/usr/bin/env python
# -*- encoding:utf-8 -*-

'''
Created on 2013-8-17

@author: root
'''

import os
import sys
import urllib
import ujson
import redis
import time
import threading
import subprocess
from bottle import route,run,debug,request,app

os.chdir(os.path.dirname(__file__))
wsgi_dir=os.path.dirname(__file__)
sys.path = [wsgi_dir]+sys.path

from public import RedisIP,RedisPort,RedisDB
from PurgeCache import exeCachePurge

@route('/flushsquid',method="GET")
def flushsquid():
    prefix = request.query.jsoncallback
    RawUrls = request.query.urls
    urlstype = int(request.query.urlstype)    
    LogKeyName = "key"+str(request.query.key)
    
    if RawUrls.strip() == "":
	DataDict = {'success':'0','text':'请输入需要刷新的URLS列表!'}    
	return prefix+"("+ujson.encode(DataDict)+")"
    else:
       RawUrls = RawUrls.strip(",") 
    
    UrlsList = RawUrls.split(",")
    
    QuitFlag = False
    PathList = []
    
    #判断收到的URL是否是同域名下同类型的URL(同是文件或目录)
    FirstUrl = UrlsList[0]
    proto,rest = urllib.splittype(FirstUrl)
    DomainName,path = urllib.splithost(rest)
    if "." in path:
        UrlType = "file"
    else:
        UrlType = "dir"
            
    for url in UrlsList:
        proto,rest = urllib.splittype(url)
        Thost,Tpath = urllib.splithost(rest)
        if "." in Tpath:
            TUrlType = "file"
        else:
            TUrlType = "dir"
        if DomainName != Thost or UrlType != TUrlType:
            QuitFlag = True
            break
        else:
            PathList.append(Tpath)

    if QuitFlag == False:
        try:
            #调用刷新类
            PurgeCacheObj =  exeCachePurge(UrlType,PathList,DomainName,LogKeyName)
            PurgeCacheObj.start()
        except Exception,e:
            DataDict =  {'success':'0','text':'%s'%e}
        else:
            DataDict =  {'success':'1'}
    else:
        DataDict = {'success':'0','text':'刷新的URLS需是同域名同类型的!'}    
              
    return prefix+"("+ujson.encode(DataDict)+")"  

@route('/getstdout',method="GET")
def getStdout ():
    prefix = request.query.jsoncallback
    keyname = "key"+str(request.query.key)
    redispool = redis.ConnectionPool(host=RedisIP,port=RedisPort,db=RedisDB)
    redata = redis.Redis(connection_pool=redispool)
    line = redata.blpop(keyname,245)
    if line == None:
        DataDict = {"success":'0'}
    else:
        DataDict = {"success":'1','text':line[1]}
    return prefix+"("+ujson.encode(DataDict)+")"
    sys.exit()

application = app() 
