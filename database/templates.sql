-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: 192.168.240.12:3306
-- Generation Time: Mar 09, 2022 at 10:42 AM
-- Server version: 10.5.13-MariaDB
-- PHP Version: 8.0.15

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `templates`
--
CREATE DATABASE IF NOT EXISTS `templates` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `templates`;

-- --------------------------------------------------------

--
-- Table structure for table `default_template`
--

CREATE TABLE `default_template` (
  `id` int(11) NOT NULL,
  `event_title` varchar(250) NOT NULL,
  `event_description` varchar(250) NOT NULL,
  `event_color` varchar(10) NOT NULL,
  `event_thumbnail` varchar(500) NOT NULL,
  `regexp_b64` varchar(500) NOT NULL,
  `creation_response` text NOT NULL,
  `max_players` int(11) NOT NULL,
  `event_footer` varchar(500) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `default_template`
--

INSERT INTO `default_template` (`id`, `event_title`, `event_description`, `event_color`, `event_thumbnail`, `regexp_b64`, `creation_response`, `max_players`, `event_footer`) VALUES
(1, 'Dark Hours', 'Insert Dark Hours description', '000000', 'https://maxcerny.eu/black_tusk_thumbnail.png', 'XihkaHxkYXJrfGhvdXJzPykk', 'Dark Hours selected', 8, 'This is not your code anymore'),
(2, 'Iron Horse', 'When I landed a gig at United Ironworks, I thought I was set. Medical, dental, the works. Four days later, Green Poison killed my insurance, then my parents.', '00FFFF', 'https://maxcerny.eu/black_tusk_thumbnail.png', 'XihpaHxpcm9ufGhvcnNlKSQ=', 'Iron Horse selected', 8, 'Neither is this');

-- --------------------------------------------------------

--
-- Table structure for table `template_roles`
--

CREATE TABLE `template_roles` (
  `template_id` int(11) NOT NULL,
  `role_id` int(11) NOT NULL,
  `role_count` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `template_roles`
--

INSERT INTO `template_roles` (`template_id`, `role_id`, `role_count`) VALUES
(1, 1, 8),
(1, 2, 1),
(1, 3, 1),
(2, 1, 8),
(2, 2, 2),
(2, 4, 1),
(2, 5, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `default_template`
--
ALTER TABLE `default_template`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `template_roles`
--
ALTER TABLE `template_roles`
  ADD UNIQUE KEY `roles_pk` (`template_id`,`role_id`),
  ADD KEY `roles_role_id_fk` (`role_id`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `template_roles`
--
ALTER TABLE `template_roles`
  ADD CONSTRAINT `roles_default_template_id_fk` FOREIGN KEY (`template_id`) REFERENCES `default_template` (`id`),
  ADD CONSTRAINT `roles_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `signups`.`role` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
