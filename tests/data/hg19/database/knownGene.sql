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
-- Table structure for table `knownGene`
--

DROP TABLE IF EXISTS `knownGene`;
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = utf8;
CREATE TABLE `knownGene` (
  `name` varchar(255) NOT NULL default '',
  `chrom` varchar(255) NOT NULL default '',
  `strand` char(1) NOT NULL default '',
  `txStart` int(10) unsigned NOT NULL default '0',
  `txEnd` int(10) unsigned NOT NULL default '0',
  `cdsStart` int(10) unsigned NOT NULL default '0',
  `cdsEnd` int(10) unsigned NOT NULL default '0',
  `exonCount` int(10) unsigned NOT NULL default '0',
  `exonStarts` longblob NOT NULL,
  `exonEnds` longblob NOT NULL,
  `proteinID` varchar(40) NOT NULL default '',
  `alignID` varchar(255) NOT NULL default '',
  KEY `name` (`name`),
  KEY `chrom` (`chrom`(16),`txStart`),
  KEY `chrom_2` (`chrom`(16),`txEnd`),
  KEY `protein` (`proteinID`(16)),
  KEY `align` (`alignID`)
) ENGINE=MyISAM DEFAULT CHARSET=latin1;
SET character_set_client = @saved_cs_client;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2009-12-06 22:03:07
