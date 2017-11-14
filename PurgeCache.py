#!/usr/bin/env python
#-*- coding: utf-8 -*-

import sys
import urllib2
import urllib
import string
import StringIO
import hashlib
import socket
import redis
import time
import ujson
import public
import subprocess
import threading
from public import SendMail,WebHadoop


class exeCachePurge(threading.Thread):

    def __init__(self,type,list,pad,LogKeyName):
        
        self.cdn_url_purge = public.cdn_url_purge
        self.cdn_url_checkstatus = public.cdn_url_checkstatus
        self.username = public.username
        self.passwd = public.passwd
        self.pad = pad
        self.logger = public.getLog(LogKeyName)
        self.TypeAliases = type
        
        self.FlushPrefix = "http://" + self.pad 
        self.SquidServer = public.SquidServer
        self.SquidPort = public.SquidPort
        self.list = list
        
        self.AllFilesPathList = []
        self.StoWebHdfs = WebHadoop(public.HdfsIntGateway,14000,"cloudiyadatauser",self.logger)
        
                
        if type == "file":
            type = "item"
            cdnpaths = ""
            for path in list:
                cdnpaths = "&path=%s"%(path) + cdnpaths
        elif type == "dir":
            type = "wildcard"
            cdnpaths = ""
            for path in list:
                cdnpaths = "&path=%s/*"%(path) + cdnpaths        
         
        self.type = type
        self.list = list
        self.cdnpaths = cdnpaths
    
        
        self.logger.info(" Purge Base Info  \n \
                          Purge Type : %s   \n \
                          Purge Pad  : %s   \n \
                          Purge List : %s   \n \
                          CDN Purge Paths : %s \n \
                    "%(self.type,self.pad,self.list,self.cdnpaths))
        
        threading.Thread.__init__(self)
    
    def GetAllFilePathInDir(self,dir):
        dir = str(dir[6:])
        DirInfoList = self.StoWebHdfs.lsdir(dir)
        if len(DirInfoList) == 0:
            self.logger.warning("No ListStatus For Dir %s,Scan Other Dir...."%dir)
        else:
            for x,y in enumerate(DirInfoList):
                if y['type'] == "FILE":
                    FileName = y['pathSuffix']
                    self.AllFilesPathList.append(dir+'/'+FileName)
                elif y['type'] == 'DIRECTORY':
                    DirName = y['pathSuffix']
                    DirPath = dir+'/'+DirName
                    self.GetAllFilePathInDir(DirPath)
                                    
    def SendPost(self,url,data):
        RetObj = urllib2.urlopen(url, data)
        return RetObj.read()    
    
    def SquidPurge(self):
        self.logger.info("Start Purge Squid,Please Wait......")
        if self.TypeAliases == "dir":
            for dir in self.list:
                self.logger.info("--------------------------------------------------------------")
                self.logger.info("Start Purge Squid For Root Dir %s"%dir)
                self.GetAllFilePathInDir(dir)
                for item in self.AllFilesPathList:
                    FilePath = self.FlushPrefix+item
                    self.logger.info("File : %s"%FilePath)
                    CmdString = "/usr/bin/env squidclient -m PURGE -h %s -p %s %s"%(self.SquidServer,self.SquidPort,FilePath)
                    subprocess.call(CmdString,shell=True)
                self.AllFilesPathList = []
        else:
            for file in self.list:
                self.logger.info("--------------------------------------------------------------")
                FilePath = self.FlushPrefix + file
                self.logger.info("File : %s"%FilePath)
                CmdString = "/usr/bin/env squidclient -m PURGE -h %s -p %s %s"%(self.SquidServer,self.SquidPort,FilePath)
                subprocess.call(CmdString,shell=True) 
                     
        self.logger.info("Purge Squid End")    
        
    def CDNPurge(self):
        self.logger.info("Start Commit Purge CDN Action,Please Waiting.....")
        
        params = "user=%s"%self.username + "&" + "pass=%s"%self.passwd + "&" + "pad=%s"%self.pad + "&" + "type=%s"%self.type + "&" + "output=json" + self.cdnpaths
        params = params.encode("utf-8")
        try:
            resp_data_json = self.SendPost(self.cdn_url_purge,params)
            resp_data_dict = ujson.decode(resp_data_json)   
            self.logger.info("Response Info From CDN API ： \n \
                              %s"%resp_data_json)          
            if resp_data_dict["resultCode"] == 200:
               self.logger.info("Commit CDN Purge Action Success!,After Wait a Moment,Will Check The Purge Status....")
               pid = resp_data_dict["pid"]
               time.sleep(240)
               self.CheckStatus(pid)
            else:
               self.logger.error("Commit CDN Purge Action Fail!")
               SendMail(self.TypeAliases,self.list)
               sys.exit()     
        except Exception,e:
            self.logger.info("Call CDN API Exeception : %s"%e)
            SendMail(self.TypeAliases,self.list)
            sys.exit()
    
    def CheckStatus(self,pid):
        self.logger.info("Start Check CDN Purge Status,Please Waiting....,(pid=%s)"%pid)
        
        params = "user=%s"%self.username + "&" + "pass=%s"%self.passwd + "&" + "output=json" + "&" + "pid=%s"%pid
        params = params.encode("utf-8")
        try:
            resp_data_json = self.SendPost(self.cdn_url_checkstatus,params)
            resp_data_dict = ujson.decode(resp_data_json)            
            self.logger.info("Response Info From CDN API : \n \
                              %s"%resp_data_json)
            if resp_data_dict["resultCode"] == 200:
                if resp_data_dict["percentComplete"] == 100:
                    self.logger.info("Pid %s ,Purge CDN Cache Success!"%pid)
                else:
                    self.logger.warn("Pid %s ,Purge CDN Cache Processing,Progress To %s"%(pid,resp_data_dict["percentComplete"]))
            else:
               self.logger.error("pid %s,Check Purge Status Error,Detail Info is :%s"%(pid,resp_data_dict["details"]))                
        except Exception,e:
            self.logger.error("Call CDN API Exeception : %s"%e)
            SendMail(self.TypeAliases,self.list)
            sys.exit()

    def run(self):
        self.SquidPurge()
        self.CDNPurge()
       
if __name__ == "__main__":
    list = ['/l123/l123ZJk']
    #list = ['/k0gd/k0gdeB2/240p/output.m3u8','/k0gd/k0gdeB2/360p/output.m3u8','/k0gd/k0gdeB2/480p/output.m3u8','/k0gd/k0gdeB2/720p/output.m3u8'] 
    PurgeCacheObj = exeCachePurge("dir",list)
    PurgeCacheObj.run()
