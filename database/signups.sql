-- phpMyAdmin SQL Dump
-- version 5.1.3
-- https://www.phpmyadmin.net/
--
-- Host: 192.168.240.12:3306
-- Generation Time: Mar 09, 2022 at 01:08 PM
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
-- Database: `signups`
--
CREATE DATABASE IF NOT EXISTS `signups` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `signups`;

-- --------------------------------------------------------

--
-- Table structure for table `event_params`
--

CREATE TABLE `event_params` (
  `message_id` bigint(255) NOT NULL,
  `event_title` varchar(250) NOT NULL,
  `event_description` varchar(250) NOT NULL,
  `event_color` varchar(250) NOT NULL,
  `event_thumbnail` varchar(500) NOT NULL,
  `event_time` datetime NOT NULL,
  `event_author_id` bigint(20) NOT NULL,
  `max_players` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `event_params`
--


-- --------------------------------------------------------

--
-- Table structure for table `event_roles`
--

CREATE TABLE `event_roles` (
  `event_id` bigint(255) NOT NULL,
  `role_id` int(11) NOT NULL,
  `role_count` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `event_roles`
--

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

CREATE TABLE `role` (
  `id` int(11) NOT NULL,
  `role_name` varchar(250) NOT NULL,
  `discord_emote` varchar(250) DEFAULT NULL,
  `reaction_value` varchar(250) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`id`, `role_name`, `discord_emote`, `reaction_value`) VALUES
(1, 'DPS', '<:custom_emoji:819698693300420628>', 'offense'),
(2, 'Tank', '<:custom_emoji:819698728943747073>', 'defense'),
(3, 'Jammer', '<:custom_emoji:819698662552371240>', 'tech'),
(4, 'Hazard', '<:custom_emoji:820504586674241537>', 'hazard'),
(5, 'Healer', '<:custom_emoji:820504586674241537>', 'healer');

-- --------------------------------------------------------

--
-- Table structure for table `signup`
--

CREATE TABLE `signup` (
  `id` int(11) NOT NULL,
  `message_id` bigint(255) NOT NULL,
  `player_id` bigint(255) NOT NULL,
  `player_nickname` varchar(250) NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `attended` tinyint(1) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `signup`
--

-- --------------------------------------------------------

--
-- Table structure for table `signup_has_roles`
--

CREATE TABLE `signup_has_roles` (
  `role_id_role` int(11) NOT NULL,
  `signup_id_signup` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `signup_has_roles`
--

--
-- Indexes for dumped tables
--

--
-- Indexes for table `event_params`
--
ALTER TABLE `event_params`
  ADD PRIMARY KEY (`message_id`);

--
-- Indexes for table `event_roles`
--
ALTER TABLE `event_roles`
  ADD PRIMARY KEY (`event_id`,`role_id`),
  ADD KEY `event_roles_role_id_fk` (`role_id`);

--
-- Indexes for table `role`
--
ALTER TABLE `role`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `signup`
--
ALTER TABLE `signup`
  ADD PRIMARY KEY (`id`),
  ADD KEY `signup_event_params_message_id_fk` (`message_id`);

--
-- Indexes for table `signup_has_roles`
--
ALTER TABLE `signup_has_roles`
  ADD PRIMARY KEY (`signup_id_signup`,`role_id_role`),
  ADD KEY `signup_has_roles_role_id_fk` (`role_id_role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `role`
--
ALTER TABLE `role`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `signup`
--
ALTER TABLE `signup`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=321;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `event_roles`
--
ALTER TABLE `event_roles`
  ADD CONSTRAINT `event_roles_event_params_message_id_fk` FOREIGN KEY (`event_id`) REFERENCES `event_params` (`message_id`),
  ADD CONSTRAINT `event_roles_role_id_fk` FOREIGN KEY (`role_id`) REFERENCES `role` (`id`);

--
-- Constraints for table `signup`
--
ALTER TABLE `signup`
  ADD CONSTRAINT `signup_event_params_message_id_fk` FOREIGN KEY (`message_id`) REFERENCES `event_params` (`message_id`);

--
-- Constraints for table `signup_has_roles`
--
ALTER TABLE `signup_has_roles`
  ADD CONSTRAINT `signup_has_roles_role_id_fk` FOREIGN KEY (`role_id_role`) REFERENCES `role` (`id`),
  ADD CONSTRAINT `signup_has_roles_signup_id_fk` FOREIGN KEY (`signup_id_signup`) REFERENCES `signup` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
