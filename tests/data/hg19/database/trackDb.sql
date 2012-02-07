-- MySQL dump 10.11
--
-- Host: localhost    Database: hg19
-- ------------------------------------------------------
-- Server version	5.0.67

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `trackDb`
--

DROP TABLE IF EXISTS `trackDb`;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
CREATE TABLE `trackDb` (
  `tableName` varchar(255) NOT NULL,
  `shortLabel` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `longLabel` varchar(255) NOT NULL,
  `visibility` tinyint(3) unsigned NOT NULL,
  `priority` float NOT NULL,
  `colorR` tinyint(3) unsigned NOT NULL,
  `colorG` tinyint(3) unsigned NOT NULL,
  `colorB` tinyint(3) unsigned NOT NULL,
  `altColorR` tinyint(3) unsigned NOT NULL,
  `altColorG` tinyint(3) unsigned NOT NULL,
  `altColorB` tinyint(3) unsigned NOT NULL,
  `useScore` tinyint(3) unsigned NOT NULL,
  `private` tinyint(3) unsigned NOT NULL,
  `restrictCount` int(11) NOT NULL,
  `restrictList` longblob NOT NULL,
  `url` longblob NOT NULL,
  `html` longblob NOT NULL,
  `grp` varchar(255) NOT NULL,
  `canPack` tinyint(3) unsigned NOT NULL,
  `settings` longblob NOT NULL,
  PRIMARY KEY  (`tableName`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
SET character_set_client = @saved_cs_client;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2012-01-22 21:27:46
