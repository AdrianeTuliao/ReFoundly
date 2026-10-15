-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 15, 2026 at 01:50 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `refoundly_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `admins`
--

CREATE TABLE `admins` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `suspend_reasons` text DEFAULT NULL,
  `suspended_until` datetime DEFAULT NULL,
  `status` enum('active','deactivated','suspended') NOT NULL DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admins`
--

INSERT INTO `admins` (`id`, `name`, `email`, `password`, `contact_number`, `created_at`, `suspend_reasons`, `suspended_until`, `status`) VALUES
(1, 'Admin0', 'admin@gmail.com', '$2b$10$uMGxmyVPbo4Vygam/cChC.XgEOBVL8WxBHmRZ.OFYCeG2XSLAAkfC', '9950000000', '2026-01-27 15:02:01', NULL, NULL, 'active'),
(2, 'Admin1', 'admin1@gmail.com', '$2b$10$I4FtlYZuNBeht2A5TMU0yOP22FgcwaMbcQRHU6GSrQnScX3nrDyT2', '09959388798', '2026-03-06 14:41:47', NULL, NULL, 'active'),
(3, 'Admin2', 'admin2@gmail.com', '$2b$10$BxbBsQKSSZDto9Y71hs3vOAYxb15lLfyAsj/saD1eC5acuqJGazSW', '90909090901', '2026-03-16 17:03:25', NULL, NULL, 'active'),
(4, 'admin3', 'admin3@gmail.com', '$2b$10$lyt8.brDVz2PHLS8aujokOn1SApbOtUJ0bmEGwa/QOwSKBDl6bf2a', '90909090909', '2026-03-16 17:06:12', NULL, NULL, 'active'),
(5, 'admin5', 'admin5@gmail.com', '$2b$10$e39lkyuzajZR8oLFbQRtuePDX85g8QT35X/eIsj5jsSWDIiH3Sixe', '09090909090', '2026-03-16 17:08:14', NULL, NULL, 'active'),
(6, 'April', 'april@gmail.com', '$2b$10$qcDwGteAo17tTR/cYtf6OuY1s4P70YmrSIvmkxDO7S3yKLcjBl68C', '09959388798', '2026-08-17 13:04:23', '[\"Spamming\"]', NULL, 'suspended');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `admin_id` int(11) DEFAULT NULL,
  `action` varchar(255) NOT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`id`, `user_id`, `admin_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
(1, 5, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"type\":\"Lost\",\"txHash\":\"0x1e8aa53fd3c446728b70532bb83453635449cc8ef7f59e6e80b45573bb18c12a\",\"wallet\":\"0x476893BF34ac2e30259b51B1B08809eE6860F2b5\"}', '::1', '2026-02-23 16:25:27'),
(2, 5, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":26,\"status\":\"Published\",\"wallet\":\"0x03993a3bDF34c76DaF5ee2c8eb1FA98699177996\"}', '::1', '2026-02-23 16:25:58'),
(3, 5, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"type\":\"Found\",\"txHash\":\"0x0e1e2abfff72bccc0c5e67a6f5023d0fe2dcabc0d89d5050fab43d8e9f873f65\",\"wallet\":\"0x476893BF34ac2e30259b51B1B08809eE6860F2b5\"}', '::1', '2026-02-23 16:31:46'),
(4, 5, 1, 'ADMIN_STATUS_DENIED', '{\"itemId\":27,\"status\":\"Denied\",\"wallet\":\"0x03993a3bDF34c76DaF5ee2c8eb1FA98699177996\"}', '::1', '2026-02-23 16:32:17'),
(9, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"ianilokano@example.com\"}', '::1', '2026-02-23 17:04:18'),
(10, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"ianilokano@example.com\"}', '::1', '2026-02-23 17:08:38'),
(11, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Laptop\",\"type\":\"Lost\",\"txHash\":\"0xcc848bb9dd6c65e1afdc53a3751af69ad63077f6eaa839c5548882c85269c2de\",\"wallet\":\"0x2Aa53E16314f9CDC533494613609Fad32F81e504\",\"identifier\":null}', '::1', '2026-02-25 14:39:40'),
(12, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"type\":\"Lost\",\"txHash\":\"0xb92f3bb5b17285de39f4b228386050a249698cb709e038c45f9951293fd319da\",\"wallet\":\"0x577E6acb98CA0Ac43542A7fC187eA45FFC7cF490\",\"gas\":\"22420\",\"identifier\":null}', '::1', '2026-02-25 14:57:44'),
(13, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":29,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 14:58:33'),
(14, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Toolbox\",\"type\":\"Found\",\"txHash\":\"0x34733d3adb1d5e6d9ba6bc22809dc5ea3c57a0bb2f7d2741b5ffd52a5a42fe7b\",\"wallet\":\"0x577E6acb98CA0Ac43542A7fC187eA45FFC7cF490\",\"gasUsed\":\"22588\",\"identifier\":null}', '::1', '2026-02-25 15:17:38'),
(15, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":30,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 15:18:38'),
(16, 2, NULL, 'ITEM_REPORTED', '{\"item\":\"Book\",\"type\":\"Lost\",\"txHash\":\"0xae12a7bfb82b431c002cfdccfc1e78c8da1acb49d6869d26b8e20da8a24d2d45\",\"wallet\":\"0x577E6acb98CA0Ac43542A7fC187eA45FFC7cF490\",\"gasUsed\":\"163231\",\"identifier\":null}', '::1', '2026-02-25 18:01:51'),
(17, 2, NULL, 'ITEM_REPORTED', '{\"item\":\"Necklace\",\"type\":\"Found\",\"txHash\":\"0x432b1eaac78ca3a13e3518ceebe6a8ffa4416b5f8c2200f165c1e2334be5efd8\",\"wallet\":\"0x577E6acb98CA0Ac43542A7fC187eA45FFC7cF490\",\"gasUsed\":\"146263\",\"identifier\":null}', '::1', '2026-02-25 18:03:03'),
(18, 2, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"type\":\"Found\",\"txHash\":\"0xef325b83b32453e6bc98de082b18c7bb566832fa8a67a5f5d6f761e58d9e5bde\",\"wallet\":\"0x577E6acb98CA0Ac43542A7fC187eA45FFC7cF490\",\"gasUsed\":\"146383\",\"identifier\":null}', '::1', '2026-02-25 18:09:01'),
(19, NULL, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":33,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 19:31:06'),
(20, 2, 1, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"type\":\"Lost\",\"txHash\":\"0x5d71ebd1fcbca91fd3a61eac4e1599ed30fc3bbf466bbcd9739e2c436ef2dd0e\",\"wallet\":\"0x577E6acb98CA0Ac43542A7fC187eA45FFC7cF490\",\"gasUsed\":\"146251\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 20:19:08'),
(21, 2, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":34,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 20:20:04'),
(22, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":35,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 20:55:10'),
(23, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":36,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 20:56:52'),
(24, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":37,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 20:57:22'),
(25, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":38,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 20:57:31'),
(26, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":39,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 21:00:08'),
(27, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":40,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 21:00:46'),
(28, 1, NULL, 'ITEM_REPORTED', '{\"itemId\":41,\"item\":\"Book\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 21:04:48'),
(29, 1, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":41,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:05:07'),
(30, 1, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":40,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:06:56'),
(31, 1, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":39,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:06:58'),
(32, 1, 1, 'ADMIN_STATUS_DENIED', '{\"itemId\":38,\"status\":\"Denied\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:07:03'),
(33, 1, 1, 'ADMIN_STATUS_DENIED', '{\"itemId\":37,\"status\":\"Denied\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:07:06'),
(34, 1, 1, 'ADMIN_STATUS_DENIED', '{\"itemId\":36,\"status\":\"Denied\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:07:08'),
(35, 6, NULL, 'ITEM_REPORTED', '{\"itemId\":42,\"item\":\"Smartphone\",\"txHash\":null,\"identifier\":null}', '::1', '2026-02-25 21:09:12'),
(36, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:10:20'),
(37, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":44,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:34:58'),
(38, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":45,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:36:57'),
(39, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":46,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:39:54'),
(40, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":47,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:42:43'),
(41, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":48,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:45:44'),
(42, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":48,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:46:14'),
(43, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":49,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-25 21:52:18'),
(44, 6, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":49,\"txHash\":\"0x00218ebe1820511a7e2d84200ccdf2bf01d3555872f813496b7248ca1914fadb\",\"gasUsed\":\"146276\",\"identifier\":null}', '::1', '2026-02-25 21:52:19'),
(45, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":49,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 21:52:59'),
(46, NULL, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":49,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 22:16:54'),
(47, NULL, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":48,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 22:30:16'),
(48, 6, 1, 'ITEM_REPORTED', '{\"item\":\"Toolbox\",\"itemId\":50,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 22:33:07'),
(49, 6, 1, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":50,\"txHash\":\"0xdb3f7b8c2ba76c0baeba2554c3b97c337f57ba854c9203451abe5998112c3afb\",\"gasUsed\":\"146372\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 22:33:07'),
(50, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":50,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 22:33:20'),
(51, 6, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":50,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-25 22:33:52'),
(52, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":51,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-26 03:00:10'),
(53, 6, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":51,\"txHash\":\"0xd953676e7258427e7000aecb50dc5a8d844044a84731ff86bc6e45106e54cea2\",\"gasUsed\":\"146324\",\"identifier\":null}', '::1', '2026-02-26 03:00:10'),
(54, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Laptop\",\"itemId\":52,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-26 03:00:56'),
(55, 6, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":52,\"txHash\":\"0xc0a79b0376fce038d413a2e254134eafaa15a8b893308784c496fb626da71c66\",\"gasUsed\":\"146420\",\"identifier\":null}', '::1', '2026-02-26 03:00:56'),
(56, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Toolbox\",\"itemId\":53,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-26 03:02:41'),
(57, 6, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":53,\"txHash\":\"0xe9dec471f0ff5851fab5e3269866342e89f6fb88c0987fcaa6f9c1fc5dc793d4\",\"gasUsed\":\"146312\",\"identifier\":null}', '::1', '2026-02-26 03:02:42'),
(58, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":53,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 03:03:59'),
(59, 6, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":53,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 03:04:04'),
(60, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"Book\",\"itemId\":54,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-26 03:12:26'),
(61, 6, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":54,\"txHash\":\"0xd18403d8532c7fa6765c866c0efbf1588717eaee5933621fdfbf26d03c91ad86\",\"gasUsed\":\"163532\",\"identifier\":null}', '::1', '2026-02-26 03:12:26'),
(62, 6, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":55,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-02-26 03:13:20'),
(63, 6, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":55,\"txHash\":\"0xce8176caf7cf7c99186c861c973cfac40b2e22dcc58e49a6502a512221068384\",\"gasUsed\":\"146216\",\"identifier\":null}', '::1', '2026-02-26 03:13:20'),
(64, 6, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":55,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 03:13:52'),
(65, 6, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":55,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 03:13:55'),
(66, NULL, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":54,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:10:30'),
(67, 2, 1, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":56,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:16:41'),
(68, 2, 1, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":56,\"txHash\":\"0x70933475f8f4b169e9cdfe3c9c3dc65f20c6e1cad5d217d4d3af2e3c827e1457\",\"gasUsed\":\"146372\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:16:41'),
(69, 2, 1, 'ITEM_REPORTED', '{\"item\":\"Book\",\"itemId\":57,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:17:12'),
(70, 2, 1, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":57,\"txHash\":\"0x6fffa10f45b3fa0ebf99f665f2d12fe9abf95567a9b80dd4be8180b57e436a9b\",\"gasUsed\":\"146228\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:17:12'),
(71, 2, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":56,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:17:20'),
(72, 2, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":56,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:17:23'),
(73, NULL, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":57,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:56:58'),
(74, NULL, 1, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":57,\"status\":\"Resolved\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-02-26 09:57:00'),
(75, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-02 15:46:40'),
(76, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-02 15:46:40'),
(77, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-02 15:46:40'),
(78, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 03:15:23'),
(79, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 03:15:23'),
(80, NULL, NULL, 'LOGIN_RATE_LIMIT_EXCEEDED', '{\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 03:15:23'),
(81, NULL, NULL, 'LOGIN_BRUTE_FORCE_BLOCKED', '{\"email\":\"tuliao.maradriane.m@gmail.com\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 15:04:03'),
(82, NULL, NULL, 'LOGIN_BRUTE_FORCE_BLOCKED', '{\"email\":\"tuliao.maradriane.m@gmail.com\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 15:04:06'),
(83, NULL, NULL, 'LOGIN_BRUTE_FORCE_BLOCKED', '{\"email\":\"tuliao.maradriane.m@gmail.com\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 15:04:09'),
(84, NULL, NULL, 'LOGIN_BRUTE_FORCE_BLOCKED', '{\"email\":\"tuliao.maradriane.m@gmail.com\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-05 15:04:12'),
(85, 16, 1, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":58,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin@gmail.com\"}', '::1', '2026-03-11 13:08:53'),
(86, 16, 1, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":58,\"txHash\":\"0xbe5d01ac1ab1ee2ec3528b59f01ce7887d47433cc8896bb35f10adb7c50cd58a\",\"gasUsed\":\"146372\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-03-11 13:08:53'),
(87, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":59,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 13:16:20'),
(88, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":59,\"txHash\":\"0x0f9daaf8b966349a6f8830b7ebf718192b88bb1dff5b29f45c8508967fc8b0cf\",\"gasUsed\":\"22716\",\"identifier\":null}', '::1', '2026-03-11 13:16:20'),
(89, 16, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":58,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-03-11 13:17:43'),
(90, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Book\",\"itemId\":60,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 13:59:59'),
(91, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Book\",\"itemId\":61,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:00:21'),
(92, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Book\",\"itemId\":62,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:00:36'),
(93, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":63,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:02:40'),
(94, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":64,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:04:50'),
(95, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":65,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:06:40'),
(96, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":66,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:06:46'),
(97, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":67,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:08:51'),
(98, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Bag\",\"itemId\":68,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-11 14:21:11'),
(99, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":68,\"txHash\":\"0x0d475852a7e4dd41e80bbf0b1b5eb421ecc7958c212e8198157fb5ee6534ec91\",\"gasUsed\":\"137239\",\"identifier\":null}', '::1', '2026-03-11 14:21:11'),
(100, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":67,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-13 15:42:46'),
(101, 16, 1, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":66,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin@gmail.com\"}', '::1', '2026-03-13 15:43:46'),
(103, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":69,\"txHash\":\"0xeb44bc81611846de81e28bab044e65d84b3f1778e061625f30bd250610cf9369\",\"gasUsed\":\"137575\",\"identifier\":null}', '::1', '2026-03-16 15:05:47'),
(104, 16, 2, 'ADMIN_STATUS_DENIED', '{\"itemId\":69,\"status\":\"Denied\",\"wallet\":\"Server-Only\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-16 15:25:58'),
(105, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":70,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-16 15:59:14'),
(106, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":70,\"txHash\":\"0x1462941dbf5fa85c715ce37d540bf5a63927d66eea38c7d69d26631ab13960a8\",\"gasUsed\":\"137119\",\"identifier\":null}', '::1', '2026-03-16 15:59:14'),
(107, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Shoes\",\"itemId\":71,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-16 16:36:20'),
(108, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":71,\"txHash\":\"0xfafe94bcff5d90c2e49ec0e647fe77bf5120be0065b32a35687b760e95ef6bb6\",\"gasUsed\":\"137263\",\"identifier\":null}', '::1', '2026-03-16 16:36:20'),
(109, 16, 2, 'ITEM_REPORTED', '{\"item\":\"asdasd\",\"itemId\":72,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-16 16:37:55'),
(110, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":72,\"txHash\":\"0x1d35d3723cbef03fb2e4c40d11cf712062e4e0b007b7fa72a3baae78b7503f2a\",\"gasUsed\":\"137203\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-16 16:37:55'),
(111, NULL, NULL, 'ITEM_REPORTED', '{\"item\":\"Driver\'s License\",\"itemId\":73,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-17 09:00:37'),
(112, NULL, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":73,\"txHash\":\"0xaef47bf2b59288e8a178174d7f801c48b629e6b145f55a1f1358e383d506855e\",\"gasUsed\":\"137335\",\"identifier\":null}', '::1', '2026-03-17 09:00:37'),
(113, NULL, 2, 'ITEM_REPORTED', '{\"item\":\"Driver\'s License\",\"itemId\":74,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 09:04:00'),
(114, NULL, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":74,\"txHash\":\"0x64e9a029187265a5284a8b42ed95996994f09989f5d9633d73aac06b829d194c\",\"gasUsed\":\"137335\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 09:04:00'),
(115, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":68,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 09:21:18'),
(116, 18, 2, 'ADMIN_STATUS_DENIED', '{\"itemId\":72,\"status\":\"Denied\",\"wallet\":\"Server-Only\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 10:24:17'),
(117, 18, 2, 'ITEM_REPORTED', '{\"item\":\"Driver\'s License\",\"itemId\":75,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 10:28:56'),
(118, 18, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":75,\"txHash\":\"0x0158159f4c936e0d92f7711e9e63a283d08490fcee2f99d3f4f1d57dd7698513\",\"gasUsed\":\"137299\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 10:28:56'),
(119, 18, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":75,\"status\":\"Published\",\"wallet\":\"Server-Only\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-17 10:30:53'),
(120, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":76,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-18 15:00:25'),
(121, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":77,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-18 15:00:51'),
(122, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":78,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-18 15:03:28'),
(123, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":78,\"txHash\":\"0x88351f44cc6c7921469faece2da17726758fc89b759ad061bf745bcad20dbfbd\",\"gasUsed\":\"115029\",\"identifier\":null}', '::1', '2026-03-18 15:03:28'),
(124, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":78,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 15:04:46'),
(125, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":66,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 15:43:08'),
(126, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":77,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 16:46:56'),
(127, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":76,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 16:58:25'),
(128, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":78,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 16:59:52'),
(129, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":77,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:10:09'),
(130, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":76,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:10:21'),
(131, 16, 2, 'ITEM_REPORTED', '{\"item\":\"12411241\",\"itemId\":79,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:12:36'),
(135, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"bag\",\"itemId\":80,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-18 17:17:09'),
(136, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":80,\"txHash\":\"0xc76e1f8f10fff8dc4eed01d68be6b8d6fd85d43278aa456149f7ac028f878d0f\",\"gasUsed\":\"115053\",\"identifier\":null}', '::1', '2026-03-18 17:17:09'),
(137, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":80,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:17:44'),
(138, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":80,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:18:07'),
(139, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Phone\",\"itemId\":81,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:20:42'),
(140, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":81,\"txHash\":\"0x1017ebb0f1124eea165921205d363d32d62b70f0cb5f698dce8c821bea456712\",\"gasUsed\":\"115005\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:20:42'),
(141, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":81,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:20:54'),
(142, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":82,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:22:35'),
(143, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":82,\"txHash\":\"0x866155aa91b6940833109446b4cd7334318cc0379b987881fc5bc8a97ef53869\",\"gasUsed\":\"115089\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:22:35'),
(144, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":82,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:22:48'),
(145, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":82,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:29:05'),
(146, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":81,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:30:58'),
(147, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Bag\",\"itemId\":83,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":null}', '::1', '2026-03-18 17:32:53'),
(148, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":83,\"txHash\":\"0xd512f873ac38c3eadaa41b3aa4988f07f9a6666dcb5759c8e2a6395cff98c93e\",\"gasUsed\":\"114969\",\"identifier\":null}', '::1', '2026-03-18 17:32:53'),
(149, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":83,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:33:10'),
(150, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":82,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:39:17'),
(151, 16, 2, 'ITEM_REPORTED', '{\"item\":\"12313\",\"itemId\":84,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:40:16'),
(152, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":84,\"txHash\":\"0x69d2a9ece3006f5080c2eff5aa7e90b2fbfee059cf8e95f614571b5aca3e32df\",\"gasUsed\":\"114993\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:40:16'),
(153, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":84,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:40:24'),
(154, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Bag\",\"itemId\":85,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:45:26'),
(155, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":85,\"txHash\":\"0x46e38979384d3c8c30a33aa36b09ac1fe57e4db80f203426eafe9cffb463f444\",\"gasUsed\":\"115053\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:45:26'),
(156, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":85,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:45:52'),
(157, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":86,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:53:58'),
(158, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":86,\"txHash\":\"0x74adde6ed6c76cce9be56ac2fa5c5e4bd793b2fc7a8a5eca7388b86bfccc5681\",\"gasUsed\":\"115065\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:53:58'),
(159, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":87,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 17:56:19'),
(160, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":87,\"txHash\":\"0xe2c5293cc9fd5c159685be660a6a28f084b99a0f7c096a23956cb1a1c24eef15\",\"gasUsed\":\"115053\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 17:56:19'),
(161, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":87,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 17:56:54'),
(162, 16, 2, 'ITEM_REPORTED', '{\"item\":\"124124\",\"itemId\":88,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 18:03:44'),
(163, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":88,\"txHash\":\"0x6d7860aa23c6428386bfbc119d1459d3e116e0ef261bf2a377e80925d391f59f\",\"gasUsed\":\"114945\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:03:44'),
(164, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"phone\",\"itemId\":89,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 18:12:37'),
(165, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":89,\"txHash\":\"0xe47c4cded89afbd9fced2215e1bbbc45617852efc6228f90d5774aafa612ff80\",\"gasUsed\":\"114945\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 18:12:37'),
(166, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":89,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:15:54'),
(167, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":88,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:16:11'),
(168, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":86,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:28:17'),
(169, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":90,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 18:30:03'),
(170, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":90,\"txHash\":\"0x9a383119720daf87c789cda95a37d829d868e7e5291089058aa8475c85db8ff4\",\"gasUsed\":\"115005\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:30:03'),
(171, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":90,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:30:09'),
(172, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":91,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 18:39:32'),
(173, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":91,\"txHash\":\"0x5178a016d14d7c95058ad9e0960ad520bb3649bf7e25e8028a017c4ded9a8265\",\"gasUsed\":\"114957\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 18:39:33'),
(174, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":91,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:39:54'),
(175, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":91,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:40:07'),
(176, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":92,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 18:58:05'),
(177, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":92,\"txHash\":\"0x139b3dd0f7293e3552e70f6e6b0a12b4bb494f2ebad74036bec52c97b248f52e\",\"gasUsed\":\"115005\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 18:58:05'),
(178, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":92,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"blockchain_tx\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:58:23'),
(179, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":92,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"blockchain_tx\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 18:58:36'),
(180, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"ID\",\"itemId\":93,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:00:42'),
(181, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":93,\"txHash\":\"0x16721e503d427024975f310413972ada075823876561c5568308c8c2bfad801c\",\"gasUsed\":\"114909\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:00:42'),
(182, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":93,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:00:55'),
(183, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":93,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:00:58'),
(184, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":94,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:01:57'),
(185, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":94,\"txHash\":\"0x6ea49ac0af92ec959392b5f132b653bd461532b421fd6cb0e581108a24823212\",\"gasUsed\":\"115065\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:01:57'),
(186, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":94,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:02:01'),
(187, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":94,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:02:06'),
(188, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":95,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:07:33'),
(189, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":95,\"txHash\":\"0x1a606c31354e665098e911167239c5de748bd85003adbd4cf9b0192d44e2ef4d\",\"gasUsed\":\"115005\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:07:33'),
(190, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":95,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:07:37'),
(191, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":95,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:07:43'),
(192, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"12414\",\"itemId\":96,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:09:21'),
(193, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":96,\"txHash\":\"0xf31055f134ef78f27e567088ca1d9c05cac7da28531ea11b8b0db5bcaf0e6a24\",\"gasUsed\":\"115005\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:09:21'),
(194, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":96,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:09:27'),
(195, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":96,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:09:30'),
(196, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"14141\",\"itemId\":97,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:11:56'),
(197, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":97,\"txHash\":\"0x4288c06c6f2d80ed8868ddbf2fa5ca193f8180fce07cdaacbad9e46ae3386c1b\",\"gasUsed\":\"115077\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:11:56'),
(198, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":97,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:12:13'),
(199, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":97,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:12:15'),
(200, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Phone\",\"itemId\":98,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:15:10'),
(201, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":98,\"txHash\":\"0x71d346c5f60c7732b9d5b924ad53e74851202d633fbedd8a18fdaecc52403d0a\",\"gasUsed\":\"115029\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:15:10'),
(202, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":98,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:15:24'),
(203, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":98,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:15:26'),
(204, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":99,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"User ID: 16\"}', '::1', '2026-03-18 19:24:50'),
(205, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":99,\"txHash\":\"0x909f6b6456c4a3a3de6f2ea7088afd12c9bce79095d19471a070a8305a56b36e\",\"gasUsed\":\"114957\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:24:50'),
(206, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":99,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:25:02'),
(207, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":99,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:25:08'),
(208, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Bag\",\"itemId\":100,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:27:13'),
(209, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":100,\"txHash\":\"0x7c2f66144b9d9c1190b506c21ffbce682dda8954b809c8f6c3bfb1eff8d78042\",\"gasUsed\":\"115029\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:27:13'),
(210, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":100,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:27:34'),
(211, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":100,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:27:41'),
(212, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":101,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:30:49'),
(213, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":101,\"txHash\":\"0x2a46c1aa5850f4bcb7f48f7cd8c02c254d7094dcb1254fb0be5dbcf4ee386bf2\",\"gasUsed\":\"115053\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:30:49'),
(214, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":101,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:30:58'),
(215, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":101,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:31:02'),
(216, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":102,\"type\":\"Found\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:36:18'),
(217, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":102,\"txHash\":\"0xfde1c46cc6ec1f10914c55be1b14c8077933a5263ad0f929205fbbf923d1cd47\",\"gasUsed\":\"114957\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:36:18'),
(218, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":102,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:36:31'),
(219, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":102,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":null,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:36:37'),
(220, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":103,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:45:47'),
(221, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":103,\"txHash\":\"0x51e7dba31914b11390d16a6b5170aa05c12dd06c5e4cd87aa299a11251be28bd\",\"gasUsed\":\"115089\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:45:48'),
(222, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":103,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"0\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:45:58'),
(223, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":103,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"29386\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:46:01'),
(224, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Bag\",\"itemId\":104,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:48:37'),
(225, 16, NULL, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":104,\"txHash\":\"0x998b22748026676530c9d71f6fe204e1d20d9914f38c2882395b71b039cf4507\",\"gasUsed\":\"115053\",\"identifier\":\"Unknown\"}', '::1', '2026-03-18 19:48:37'),
(226, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":104,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"0\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:48:49'),
(227, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":104,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"29386\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-18 19:48:50'),
(230, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:07:20'),
(231, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:07:20'),
(232, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:07:21'),
(233, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:13:39'),
(234, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:13:40'),
(235, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:13:40'),
(236, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Threshold reached\",\"retryAfter\":137,\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:14:23'),
(237, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Threshold reached\",\"retryAfter\":126,\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:14:34'),
(238, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Threshold reached\",\"retryAfter\":63,\"identifier\":\"admin@refoundly.com\"}', '::1', '2026-03-19 03:15:37'),
(239, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user@refoundly.com\"}', '::1', '2026-03-19 03:19:22'),
(240, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user@refoundly.com\"}', '::1', '2026-03-19 03:19:22'),
(241, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user@refoundly.com\"}', '::1', '2026-03-19 03:19:22'),
(242, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:22:25'),
(243, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:22:25'),
(244, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:22:25'),
(245, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"target\":\"user1@refoundly.com\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:23:59'),
(246, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:26:35'),
(247, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:26:35'),
(248, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:26:35'),
(249, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"165s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:26:50'),
(250, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:33:28'),
(251, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:33:29'),
(252, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:33:29'),
(253, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:39:47'),
(254, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:39:47'),
(255, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:39:47'),
(256, NULL, 2, 'ADMIN LOGIN SUCCESS', '{\"email\":\"admin1@gmail.com\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 03:40:02'),
(257, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"148s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:40:20'),
(258, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"146s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:40:21'),
(259, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:42:31'),
(260, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:42:31'),
(261, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:42:31'),
(262, NULL, 2, 'ADMIN LOGIN SUCCESS', '{\"email\":\"admin1@gmail.com\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 03:42:39'),
(263, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"162s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:42:49'),
(264, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"161s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:42:50'),
(265, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"161s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:42:51'),
(266, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:43:46'),
(267, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:43:46'),
(268, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:43:46');
INSERT INTO `audit_logs` (`id`, `user_id`, `admin_id`, `action`, `details`, `ip_address`, `created_at`) VALUES
(269, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"161s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:44:06'),
(270, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"160s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:44:07'),
(271, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"159s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:44:07'),
(272, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"157s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 03:44:09'),
(273, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"93s\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-19 03:45:14'),
(274, 16, 2, 'ITEM_REPORTED', '{\"item\":\"Phone\",\"itemId\":106,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 03:47:45'),
(275, 16, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":106,\"txHash\":\"0x3b04f37ab67707d66b288b6b19c00098e6181dd87b35041a0d7e4e2cb2bd403c\",\"gasUsed\":\"115029\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 03:47:45'),
(276, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":106,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"0\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 03:48:22'),
(277, NULL, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":106,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"29386\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 03:48:36'),
(278, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Wrong password\",\"identifier\":\"hanslambino3@gmail.com\"}', '::1', '2026-03-19 05:42:14'),
(279, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Wrong password\",\"identifier\":\"hanslambino3@gmail.com\"}', '::1', '2026-03-19 05:42:15'),
(280, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Wrong password\",\"identifier\":\"hanslambino3@gmail.com\"}', '::1', '2026-03-19 05:42:16'),
(281, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"164s\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-19 05:42:30'),
(282, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"163s\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-03-19 05:42:31'),
(283, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"141s\",\"identifier\":\"hanslambino3@gmail.com\"}', '::1', '2026-03-19 05:42:54'),
(284, NULL, NULL, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"104s\",\"identifier\":\"user1@refoundly.com\"}', '::1', '2026-03-19 05:43:31'),
(285, 19, 2, 'ITEM_REPORTED', '{\"item\":\"Wallet\",\"itemId\":107,\"type\":\"Lost\",\"txHash\":null,\"wallet\":null,\"gasUsed\":0,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 05:48:38'),
(286, 19, 2, 'BLOCKCHAIN_ANCHOR_SUCCESS', '{\"itemId\":107,\"txHash\":\"0xa64da636ea291811bca132416e73f96bb2ab97800bb27444f955ef6bee347f90\",\"gasUsed\":\"114993\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 05:48:38'),
(287, 19, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":107,\"status\":\"Published\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"0\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 05:49:45'),
(288, 19, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":107,\"status\":\"Resolved\",\"wallet\":\"0x82911c4D4700DB54C16a57c96F60391f28019494\",\"gasUsed\":\"29386\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-03-19 05:50:27'),
(289, 16, NULL, 'ITEM_REPORTED', '{\"item\":\"Smartphone\",\"itemId\":108,\"type\":\"Lost\",\"identifier\":\"User ID: 16\"}', '::1', '2026-07-24 05:16:10'),
(290, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":108,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-07-24 05:43:03'),
(291, 16, NULL, 'USER_PASSWORD_CHANGE', '{\"userId\":16,\"identifier\":\"User ID: 16\"}', '::1', '2026-07-27 14:40:46'),
(292, 16, NULL, 'USER_PASSWORD_CHANGE', '{\"userId\":16,\"identifier\":\"User ID: 16\"}', '::1', '2026-07-27 14:45:09'),
(293, 16, NULL, 'USER_PASSWORD_CHANGE', '{\"userId\":16,\"identifier\":\"User ID: 16\"}', '::1', '2026-07-27 14:45:37'),
(294, 16, NULL, 'USER_PASSWORD_CHANGE', '{\"userId\":16,\"identifier\":\"User ID: 16\"}', '::1', '2026-07-27 14:45:58'),
(295, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin1@gmail.com1\"}', '::1', '2026-08-04 15:33:58'),
(296, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-04 15:34:00'),
(297, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-04 15:34:01'),
(298, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:16:26'),
(299, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:16:29'),
(300, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:16:33'),
(301, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"168s\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:16:39'),
(302, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"126s\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-08-17 15:17:21'),
(303, NULL, 2, 'SECURITY_BRUTE_FORCE_BLOCK', '{\"reason\":\"Max attempts exceeded\",\"retryAfter\":\"107s\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-08-17 15:17:40'),
(304, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:23:01'),
(305, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:23:13'),
(306, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:28:53'),
(307, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:34:48'),
(308, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:37:28'),
(309, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:45:01'),
(310, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:54:51'),
(311, 16, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 15:57:02'),
(312, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 16:06:43'),
(313, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 16:07:38'),
(314, NULL, 2, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-17 16:13:00'),
(315, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:13:16'),
(316, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":{}}', '::1', '2026-08-19 15:26:33'),
(317, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:26:41'),
(318, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:30:15'),
(319, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:31:53'),
(320, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:32:03'),
(321, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:32:04'),
(322, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:32:05'),
(323, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:32:05'),
(324, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:32:13'),
(325, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:32:13'),
(326, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:34:31'),
(327, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:34:45'),
(328, NULL, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"Admin account suspended\",\"identifier\":\"april@gmail.com\"}', '::1', '2026-08-19 15:34:55'),
(329, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:37:04'),
(330, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:38:36'),
(331, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:40:52'),
(332, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:44:57'),
(333, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:45:18'),
(334, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:45:43'),
(335, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Account suspended\",\"identifier\":\"pandonthitsdiff@gmail.com\"}', '::1', '2026-08-19 15:48:35'),
(336, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":109,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-21 14:44:55'),
(337, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":110,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-21 14:55:37'),
(338, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":111,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-23 14:24:23'),
(339, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":112,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-23 15:18:39'),
(340, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":113,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-23 15:24:34'),
(341, 18, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":114,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-08-23 15:36:09'),
(342, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"pandothitsdiff@gmail.com\"}', '::1', '2026-08-29 02:06:56'),
(343, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"Wrong password\",\"identifier\":\"tuliao.ian.14@gmail.com\"}', '::1', '2026-08-29 04:16:02'),
(344, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":6,\"itemId\":113,\"itemName\":\"Smartphone\",\"barangay\":\"Mayombo Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-09-03 15:11:01'),
(345, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":7,\"itemId\":110,\"itemName\":\"Smartphone\",\"barangay\":\"Mayombo Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-09-03 15:14:47'),
(346, NULL, NULL, 'SECURITY_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-09-06 14:28:49'),
(347, NULL, NULL, 'TRANSACTION_CONFIRMED', '{\"conversationId\":\"7\",\"itemId\":110,\"reportPath\":\"/uploads/reports/transaction_7_1789100782396.pdf\"}', NULL, '2026-09-11 04:26:22'),
(348, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":9,\"itemId\":110,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-09-11 08:55:41'),
(349, NULL, NULL, 'TRANSACTION_CONFIRMED', '{\"conversationId\":\"9\",\"itemId\":110,\"reportPath\":\"/uploads/reports/transaction_9_1789116972295.pdf\"}', NULL, '2026-09-11 08:56:12'),
(350, NULL, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":116,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-09-11 13:39:40'),
(351, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":117,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-09-11 13:42:18'),
(352, 16, 2, 'ADMIN_STATUS_RESOLVED', '{\"itemId\":114,\"status\":\"Resolved\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-09-11 13:44:44'),
(353, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":118,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-09-12 00:54:08'),
(354, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":12,\"itemId\":118,\"itemName\":\"Leather Wallet\",\"barangay\":\"Tapuac Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-09-12 00:55:47'),
(355, NULL, NULL, 'TRANSACTION_CONFIRMED', '{\"conversationId\":\"12\",\"itemId\":118,\"reportPath\":\"/uploads/reports/transaction_12_1789174577871.pdf\"}', NULL, '2026-09-12 00:56:18'),
(356, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":119,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-09-12 00:59:32'),
(357, NULL, NULL, 'MEETUP_RESCHEDULE_REQUESTED', '{\"conversationId\":\"12\",\"itemId\":118,\"requestedBy\":16,\"reason\":\"Something came up very important sorry for wasting time\",\"newBarangay\":\"Tapuac Barangay Hall\",\"newDate\":\"2026-10-01\",\"newTime\":\"09:06\"}', NULL, '2026-09-30 13:07:11'),
(358, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":12,\"itemId\":118,\"itemName\":\"Leather Wallet\",\"barangay\":\"Tapuac Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-09-30 13:07:59'),
(359, NULL, NULL, 'TRANSACTION_CONFIRMED', '{\"conversationId\":\"12\",\"itemId\":118,\"reportPath\":\"/uploads/reports/transaction_12_1790773717768.pdf\"}', NULL, '2026-09-30 13:08:38'),
(360, 16, 2, 'USER_REPORTED', '{\"reportedUserId\":22,\"reason\":\"fake_item\",\"conversationId\":9,\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-10-12 02:19:19'),
(361, 16, 2, 'ADMIN_USER_REPORT_REVIEWED', '{\"reportId\":1,\"status\":\"reviewed\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-10-12 02:19:52'),
(362, NULL, NULL, 'MEETUP_RESCHEDULE_REQUESTED', '{\"conversationId\":\"9\",\"itemId\":110,\"requestedBy\":16,\"reason\":\"\",\"newBarangay\":\"Caranglaan Barangay Hall\",\"newDate\":\"2026-10-12\",\"newTime\":\"15:07\"}', NULL, '2026-10-12 07:08:36'),
(363, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":9,\"itemId\":110,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-12 07:09:04'),
(364, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":9,\"itemId\":110,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-12 07:09:06'),
(365, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":9,\"itemId\":110,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-12 08:30:48'),
(366, NULL, NULL, 'TRANSACTION_CONFIRMED', '{\"conversationId\":\"9\",\"itemId\":110,\"reportPath\":\"/uploads/reports/transaction_9_1791793863083.pdf\"}', NULL, '2026-10-12 08:31:03'),
(367, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":127,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-10-12 18:06:17'),
(368, 16, 2, 'ADMIN_STATUS_PUBLISHED', '{\"itemId\":128,\"status\":\"Published\",\"identifier\":\"admin1@gmail.com\"}', '::1', '2026-10-12 18:09:17'),
(369, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-12 18:11:26'),
(370, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-12 18:11:28'),
(371, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-13 00:26:12'),
(372, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 04:08:09'),
(373, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 04:08:20'),
(374, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:30:55'),
(375, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:32:30'),
(376, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:34:23'),
(377, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:35:24'),
(378, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:36:56'),
(379, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:38:07'),
(380, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:38:34'),
(381, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:42:31'),
(382, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:42:41'),
(383, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:45:35'),
(384, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:49:49'),
(385, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:50:06'),
(386, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:56:05'),
(387, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 05:56:58'),
(388, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:02:41'),
(389, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:16:37'),
(390, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:16:38'),
(391, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:37:08'),
(392, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:43:02'),
(393, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:43:05'),
(394, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:43:43'),
(395, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:44:40'),
(396, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 06:58:12'),
(397, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 07:19:21'),
(398, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 08:50:40'),
(399, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 08:50:53'),
(400, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 09:51:26'),
(401, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 10:38:09'),
(402, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 10:41:29'),
(403, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 10:46:21'),
(404, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:06:49'),
(405, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:34:15'),
(406, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:34:18'),
(407, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:34:21'),
(408, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:34:23'),
(409, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:34:24'),
(410, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:37:59'),
(411, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 11:47:35'),
(412, NULL, NULL, 'DEAL_AGREEMENT_READY', '{\"conversationId\":13,\"itemId\":128,\"itemName\":\"Smartphone\",\"barangay\":\"Caranglaan Barangay Hall\",\"userOne\":\"Adriane Tuliao\",\"userTwo\":\"Datuin, Aj\"}', NULL, '2026-10-14 15:52:02'),
(413, 16, NULL, 'SECURITY_ADMIN_LOGIN_FAILURE', '{\"reason\":\"User not found\",\"identifier\":\"tuliao.maradriane.m@gmail.com\"}', '::1', '2026-10-15 08:18:17');

-- --------------------------------------------------------

--
-- Table structure for table `conversations`
--

CREATE TABLE `conversations` (
  `id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `user_one_id` int(11) NOT NULL,
  `user_two_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `user_one_agreed` tinyint(1) NOT NULL DEFAULT 0,
  `user_two_agreed` tinyint(1) NOT NULL DEFAULT 0,
  `agreement_status` enum('pending','both_agreed','admin_reviewing','confirmed','completed','cancelled','disputed','reschedule_requested') NOT NULL DEFAULT 'pending',
  `meetup_barangay` varchar(150) DEFAULT NULL,
  `meetup_date` date DEFAULT NULL,
  `meetup_time` time DEFAULT NULL,
  `admin_notified_at` timestamp NULL DEFAULT NULL,
  `admin_confirmed_by` int(11) DEFAULT NULL,
  `transaction_report_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `conversations`
--

INSERT INTO `conversations` (`id`, `item_id`, `user_one_id`, `user_two_id`, `created_at`, `updated_at`, `user_one_agreed`, `user_two_agreed`, `agreement_status`, `meetup_barangay`, `meetup_date`, `meetup_time`, `admin_notified_at`, `admin_confirmed_by`, `transaction_report_path`) VALUES
(9, 110, 16, 22, '2026-09-11 08:53:29', '2026-10-12 08:31:03', 1, 1, 'confirmed', 'Caranglaan Barangay Hall', '2026-10-12', '15:07:00', '2026-10-12 08:30:48', 2, '/uploads/reports/transaction_9_1791793863083.pdf'),
(12, 118, 16, 22, '2026-09-12 00:54:17', '2026-09-30 13:10:00', 1, 1, 'confirmed', 'Tapuac Barangay Hall', '2026-10-01', '09:06:00', '2026-09-30 13:07:59', 2, '/uploads/reports/transaction_12_1790773717768.pdf'),
(13, 128, 16, 22, '2026-10-12 18:10:37', '2026-10-14 15:52:02', 1, 1, 'admin_reviewing', 'Caranglaan Barangay Hall', '2026-10-16', '14:11:00', '2026-10-14 15:52:02', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `items`
--

CREATE TABLE `items` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `category` varchar(100) NOT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `incident_date` date NOT NULL,
  `incident_time` time NOT NULL,
  `location` varchar(255) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `is_sensitive_image` tinyint(1) NOT NULL DEFAULT 0,
  `description` text DEFAULT NULL,
  `report_type` enum('Lost','Found') NOT NULL,
  `contact_firstname` varchar(100) NOT NULL,
  `contact_lastname` varchar(100) NOT NULL,
  `contact_phone` varchar(20) NOT NULL,
  `contact_email` varchar(100) NOT NULL,
  `status` enum('Pending Approval','Published','Resolved','Denied') DEFAULT 'Pending Approval',
  `is_archived` tinyint(1) DEFAULT 0,
  `archived_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `items`
--

INSERT INTO `items` (`id`, `user_id`, `item_name`, `category`, `brand`, `incident_date`, `incident_time`, `location`, `image_path`, `is_sensitive_image`, `description`, `report_type`, `contact_firstname`, `contact_lastname`, `contact_phone`, `contact_email`, `status`, `is_archived`, `archived_at`, `created_at`) VALUES
(1, 1, 'Smartphone', 'Gadgets', 'Iphone 13 Pro', '2026-02-02', '23:11:00', 'Tebeng', '/uploads/1770045133735.jpeg', 0, 'I lost it near UPang', 'Lost', 'Marvin', 'Mandapat', '09215014106', 'marvin@example.com', 'Published', 0, NULL, '2026-02-02 15:12:13'),
(2, 1, 'Wallet', 'Wallet', 'Gucci', '2026-01-01', '11:47:00', 'Barangay IV (Zamora)', '/uploads/1770047321334.jpeg', 0, 'I lost it in front of CSI Square ', 'Lost', 'Marvin', 'Mandapat', '09550000000', 'marvin@example.com', 'Published', 0, NULL, '2026-02-02 15:48:41'),
(3, 2, 'Smartphone', 'Gadgets', 'Samsung S23 Ultra', '2026-01-14', '14:59:00', 'Poblacion Oeste', '/uploads/1770047944753.png', 0, 'I found it beside University of luzon near, the side gate', 'Found', 'Adriane', 'Tuliao', '09959388798', 'adriane@example.com', 'Published', 0, NULL, '2026-02-02 15:59:04'),
(4, 2, 'Wallet', 'Wallet', 'Lacoste', '2026-01-11', '17:53:00', 'Bolosan', '/uploads/1770133907561.jpeg', 0, 'I lost it around Puregold Mayombo.', 'Lost', 'Adriane', 'Tuliao', '09215014106', 'adriane@example.com', 'Resolved', 1, '2026-08-16 00:26:57', '2026-02-03 15:51:47'),
(5, 2, 'Smartphone', 'Gadgets', 'Iphone 11', '2026-01-01', '03:00:00', 'Pogo Chico', NULL, 0, 'I found it, outside the 7-11 in the tables outisde', 'Found', 'Adriane', 'Tuliao', '09215014106', 'adriane@example.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-02-03 15:56:51'),
(6, 2, 'Wallet', 'Wallet', 'Guess', '2026-01-09', '10:25:00', 'Bonuan Gueset', '/uploads/1770136004562.jpeg', 0, 'Nawala ko po sa loob ng SM, sa may tapat po ng Jollibe', 'Lost', 'Adriane', 'Tuliao', '09215014106', 'adriane@example.com', 'Published', 0, NULL, '2026-02-03 16:26:44'),
(7, 1, 'Smartphone', 'Gadgets', 'Iphone 11 Pro', '2026-01-12', '00:33:00', 'Barangay II (Nueva)', '/uploads/1770136464574.jpeg', 0, 'Nahanap ko sa tapat ng solid north bus station', 'Found', 'Marvin', 'Mandapat', '09215014106', 'marvin@example.com', 'Published', 0, NULL, '2026-02-03 16:34:24'),
(8, 1, 'Smartphone', 'Gadgets', 'Oppo', '2026-02-01', '00:39:00', 'Mayombo', '/uploads/1770136847674.png', 0, 'Nahanap ko sa may  papunta City High habang nag lalkad', 'Lost', 'Marvin', 'Mandapat', '09215014106', 'marvin@example.com', 'Published', 0, NULL, '2026-02-03 16:40:47'),
(11, 1, 'Smartphone', 'Gadgets', 'Iphone 13 Pro', '2026-02-14', '13:26:00', 'Mangin', '/uploads/1771047199651.jpeg', 0, 'I lost it after we ate lunch ', 'Lost', 'James Marvin ', 'Mandapat', '09493452389', 'marvin@example.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-02-14 05:33:19'),
(12, 5, 'Smartphone', 'Gadgets', 'Iphone 13 Pro', '2026-02-21', '01:25:00', 'Caranglaan', NULL, 0, '', 'Lost', 'Ian ', 'Lazaro', '09776928040', 'ianilokano@example.com', 'Published', 0, NULL, '2026-02-20 17:26:06'),
(13, 5, 'Wallet', 'Wallet', 'Guess', '2026-02-21', '01:30:00', 'Tambac', NULL, 0, 'adsasdasdasd', 'Found', 'Ian ', 'Lazaro', '09776928040', 'ianilokano@example.com', 'Published', 0, NULL, '2026-02-20 17:31:06'),
(17, 5, 'Wallet', 'Wallet', 'Gucci', '2026-02-23', '22:43:00', 'Lasip Chico', '/uploads/1771857833393.jpeg', 0, '', 'Lost', 'Ian ', 'Lazaro', '09776928040', 'ianilokano@example.com', 'Denied', 1, '2026-08-10 20:37:16', '2026-02-23 14:43:53'),
(20, 5, 'Smartphone', 'Gadgets', 'Oppo', '2026-02-23', '23:51:00', 'Bonuan Binloc', '/uploads/1771861897768.png', 0, 'dfhfghdasdashfdasdasda', 'Lost', 'Ian ', 'Lazaro', '09776928040', 'ianilokano@example.com', 'Published', 0, NULL, '2026-02-23 15:51:37'),
(26, 5, 'Smartphone', 'Gadgets', 'Samsung S23 Ultra', '2026-02-24', '00:24:00', 'Tapuac', '/uploads/1771863927238.png', 0, 'lkjdfkljdsfsfjdslflsd', 'Lost', 'Ian ', 'Lazaro', '09776928040', 'ianilokano@example.com', 'Published', 0, NULL, '2026-02-23 16:25:27'),
(27, 5, 'Wallet', 'Wallet', 'Guess', '2026-02-24', '00:31:00', 'Bolosan', '/uploads/1771864306743.webp', 0, 'nm,gfadadasdasdasd', 'Found', 'Ian ', 'Lazaro', '09776928040', 'ianilokano@example.com', 'Denied', 1, '2026-08-10 20:37:16', '2026-02-23 16:31:46'),
(28, 6, 'Laptop', 'gadgets', 'Dell', '2026-02-25', '22:38:00', 'Tapuac', '/uploads/1772030380427.jpg', 0, 'Naiwan ko siya sa may pandayan tapuac', 'Lost', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Pending Approval', 0, NULL, '2026-02-25 14:39:40'),
(29, 6, 'ID', 'id', 'National ID', '2026-02-25', '22:57:00', 'Mayombo', '/uploads/1772031464174.jpeg', 1, 'Nawala ko siya sa may puregold mayombo', 'Lost', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Published', 0, NULL, '2026-02-25 14:57:44'),
(30, 6, 'Toolbox', 'tools', 'Lotus', '2026-02-25', '23:16:00', 'Bonuan Gueset', '/uploads/1772032658199.jpeg', 0, 'nahanap ko lang siya sa tabi ng Gueset sa daan', 'Found', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Published', 0, NULL, '2026-02-25 15:17:38'),
(31, 2, 'Book', 'books', 'Statistics Book', '2026-02-26', '02:00:00', 'Tebeng', '/uploads/1772042511507.jpeg', 0, 'naiwan ko sa may kanto ng tebeng habang nag hihintay ng tricycle', 'Lost', 'Adriane', 'Tuliao', '09000000000', 'adriane@example.com', 'Pending Approval', 0, NULL, '2026-02-25 18:01:51'),
(32, 2, 'Necklace', 'accessories', 'N/A', '2026-02-26', '02:02:00', 'Bolosan', '/uploads/1772042583696.jpeg', 0, 'nakita ko po sa gilid ng kalsada, bolosan area', 'Found', 'Adriane ', 'Tuliao', '09000000000', 'adriane@example.com', 'Pending Approval', 0, NULL, '2026-02-25 18:03:03'),
(33, 2, 'Smartphone', 'gadgets', 'Huawei', '2026-02-26', '02:08:00', 'Barangay II (Nueva)', '/uploads/1772042941591.jpg', 0, 'iiiiiiiiiiiiiiiiii', 'Found', 'Adriane ', 'Tuliao', '09000000000', 'adriane@example.com', 'Published', 0, NULL, '2026-02-25 18:09:01'),
(48, 6, 'Smartphone', 'gadgets', '', '2026-02-26', '05:45:00', 'Bacayao Sur', '/uploads/1772055944668.jpg', 0, 'pagod na ako', 'Found', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-02-25 21:45:44'),
(51, 6, 'Wallet', 'wallet', 'Leisley', '2026-02-26', '10:59:00', 'Mayombo', '/uploads/1772074810312.jpg', 0, 'nawala ko sa mayombo', 'Lost', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Pending Approval', 0, NULL, '2026-02-26 03:00:10'),
(52, 6, 'Laptop', 'accessories', '', '2026-02-26', '11:00:00', 'Caranglaan', '/uploads/1772074856325.jpeg', 0, 'Kinuha ng papa ko', 'Lost', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Pending Approval', 0, NULL, '2026-02-26 03:00:56'),
(54, 6, 'Book', 'books', 'Satistics', '2026-02-26', '11:12:00', 'Barangay II (Nueva)', '/uploads/1772075546005.jpeg', 0, 'nahulog ko sa daan', 'Lost', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Published', 0, NULL, '2026-02-26 03:12:26'),
(55, 6, 'ID', 'id', 'National ID', '2026-02-26', '11:12:00', 'Tapuac', '/uploads/1772075600121.jpeg', 1, 'Nahulog ko ata sa mcdo', 'Lost', 'Piolo', 'Rodas', '09663169715', 'pandonthitsdiff@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-02-26 03:13:20'),
(58, 16, 'Smartphone', 'gadgets', 'Iphone X', '2026-03-11', '21:08:00', 'Calmay', '/uploads/1773234533189.jpeg', 0, 'nahanap ko sa tabi', 'Found', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-03-11 13:08:53'),
(60, 16, 'Book', 'books', 'readme bnook', '2026-03-11', '21:59:00', 'Mayombo', '/uploads/1773237599203.jpg', 0, 'Nawala ko sa may harapan ng puregold mayombo pa contact na lang po ako if may nakakita po thankyou!!!', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-11 13:59:59'),
(61, 16, 'Book', 'books', 'readme bnook', '2026-03-11', '21:59:00', 'Mayombo', '/uploads/1773237621683.jpg', 0, 'Nawala ko sa may harapan ng puregold mayombo pa contact na lang po ako if may nakakita po thankyou!!!', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-11 14:00:21'),
(62, 16, 'Book', 'books', 'readme bnook', '2026-03-11', '21:59:00', 'Mayombo', '/uploads/1773237636361.jpg', 0, 'Nawala ko sa may harapan ng puregold mayombo pa contact na lang po ako if may nakakita po thankyou!!!', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-11 14:00:36'),
(63, 16, 'ID', 'id', 'id ko', '2026-03-11', '22:02:00', 'Mayombo', '/uploads/1773237760743.jpg', 1, 'Nawlaa ko po sa may mayombo pa contact na lang po ako salamat po!', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-11 14:02:40'),
(64, 16, 'ID', 'id', 'n/a', '2026-03-11', '22:04:00', 'Mayombo', '/uploads/1773237890213.jpg', 1, 'nawala ko po sa may mayombo salamat po!, pa contact na lang po ako thanks', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-11 14:04:50'),
(65, 16, 'ID', 'id', 'n/a', '2026-03-11', '22:06:00', 'Mayombo', '/uploads/1773238000769.jpg', 1, 'nawala ko po sa may mayombo salamat po, paki contact na lang po ako importante po kasi sa school ko', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-11 14:06:40'),
(66, 16, 'ID', 'id', 'n/a', '2026-03-11', '22:06:00', 'Mayombo', '/uploads/1773238006112.jpg', 1, 'nawala ko po sa may mayombo salamat po, paki contact na lang po ako importante po kasi sa school ko', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-11 14:06:46'),
(67, 16, 'ID', 'id', 'n/a', '2026-03-11', '22:08:00', 'Mayombo', '/uploads/1773238131510.jpg', 1, 'sa harap ng puregold mayombo po ata nahulog', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-03-11 14:08:51'),
(68, 16, 'Bag', 'accessories', 'Mossdoom', '2026-03-11', '22:20:00', 'Pantal', '/uploads/1773238871096.jpg', 0, 'around pantal area po', 'Found', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-03-11 14:21:11'),
(71, 16, 'Shoes', 'accessories', 'CLN', '2026-03-17', '00:35:00', 'Pantal', NULL, 0, 'I found this beside Osave! may nakiwan po ata while waiting', 'Found', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-03-16 16:36:20'),
(75, 18, 'Driver\'s License', 'id', 'n/a', '2026-03-17', '18:28:00', 'Mayombo', '/uploads/1773743336699.jpeg', 1, 'id na nawala sa mayombo sa harapan ng City Mall sa parking mismo', 'Lost', 'James Marvin', 'Mandapat', '09959388987', 'marvinmandapat777@gmail.com', 'Published', 0, NULL, '2026-03-17 10:28:56'),
(76, 16, 'Wallet', 'wallet', 'N/A', '2026-03-18', '22:59:00', 'Bonuan Gueset', '/uploads/1773846025934.jpeg', 0, 'bago ako lumabas jollibee asa akin pa wallet ko', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 15:00:25'),
(77, 16, 'Wallet', 'wallet', 'N/A', '2026-03-18', '22:59:00', 'Bonuan Gueset', '/uploads/1773846051154.jpeg', 0, 'bago ako lumabas jollibee asa akin pa wallet ko', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 15:00:51'),
(78, 16, 'Wallet', 'wallet', '', '2026-03-18', '23:02:00', 'Bonuan Gueset', '/uploads/1773846208711.jpeg', 0, 'napulot ko lang po sa may gueset sa may labas ng mcdo', 'Found', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 15:03:28'),
(80, 16, 'bag', 'accessories', 'n/a', '2026-03-19', '01:16:00', 'Bonuan Binloc', '/uploads/1773854229234.jpeg', 0, 'naiwan ko po', 'Lost', 'Mar Adriane', 'Tuliao', '09999999999', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 17:17:09'),
(81, 16, 'Phone', 'gadgets', 'Nokia', '2026-03-19', '01:20:00', 'Barangay IV', '/uploads/1773854442133.jpg', 0, 'imporatante to ', 'Lost', 'Mar Adriane', 'Tuliao', '09959348897', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 17:20:42'),
(82, 16, 'Smartphone', 'gadgets', 'Samsung', '2026-03-19', '01:22:00', 'Bacayao Norte', '/uploads/1773854555308.jpg', 0, 'diko po alam saan banda', 'Lost', 'Mar Adriane', 'Tuliao', '09993838889', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-03-18 17:22:35'),
(83, 16, 'Bag', 'accessories', 'n/a', '2026-03-19', '01:32:00', 'Lomboy', '/uploads/1773855173513.jpeg', 0, 'sana mahanap', 'Lost', 'Mar Adriane', 'Tuliao', '09959389898', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-03-18 17:32:53'),
(85, 16, 'Bag', 'accessories', 'Leather', '2026-03-19', '01:45:00', 'Bonuan Gueset', '/uploads/1773855926640.jpeg', 0, 'naiwan ko sa boanuan beach sana po may nakapansin', 'Lost', 'Mar Adriane', 'Tuliao', '09959388987', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-03-18 17:45:26'),
(91, 16, 'Wallet', 'wallet', 'n/a', '2026-03-19', '02:39:00', 'Herrero', '/uploads/1773859172938.jpeg', 0, 'nawala ko po', 'Lost', 'Mar Adriane', 'Tuliao', '09999999999', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 18:39:32'),
(92, 16, 'Wallet', 'wallet', 'n/a', '2026-03-19', '02:57:00', 'Lasip Chico', '/uploads/1773860285457.jpeg', 0, 'nahanap sa tabi tabi', 'Found', 'Mar Adriane', 'Tuliao', '09090909090', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 18:58:05'),
(98, 16, 'Phone', 'gadgets', 'Nokia', '2026-03-19', '03:14:00', 'Bonuan Gueset', '/uploads/1773861310863.jpg', 0, 'nawala ko po', 'Lost', 'Mar Adriane', 'Tuliao', '99090909090', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 19:15:10'),
(99, 16, 'Wallet', 'wallet', '', '2026-03-19', '03:24:00', 'Herrero', '/uploads/1773861890385.jpeg', 0, 'nawala ko sa daan', 'Lost', 'Mar Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 19:24:50'),
(100, 16, 'Bag', 'accessories', 'Guess', '2026-03-19', '03:26:00', 'Lasip Chico', '/uploads/1773862033818.jpeg', 0, 'naiwan sa sa jeep', 'Lost', 'Mar Adriane', 'Tuliao', '09090909090', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 19:27:13'),
(102, 16, 'Wallet', 'wallet', '', '2026-03-19', '03:36:00', 'Bolosan', '/uploads/1773862578098.jpeg', 0, 'nawalwanwnawal', 'Found', 'Mar Adriane', 'Tuliao', '09090909090', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-18 19:36:18'),
(106, 16, 'Phone', 'gadgets', 'Nokia 3310', '2026-03-19', '11:47:00', 'Bonuan Gueset', '/uploads/1773892065580.jpg', 0, 'nahulog ko sa daan impotante lang to', 'Lost', 'Mar Adriane', 'Tuliao', '09959388979', 'tuliao.maradriane.m@gmail.com', 'Resolved', 1, '2026-08-10 20:37:16', '2026-03-19 03:47:45'),
(107, 19, 'Wallet', 'wallet', 'Brown Wallet', '2026-03-19', '13:48:00', 'Barangay I', '/uploads/1773899318411.jpeg', 0, 'Nawala ko po sa may downtown', 'Lost', 'Hans', 'Lambino', '09959388978', 'hanslambino3@gmail.com', 'Resolved', 1, '2026-08-16 00:26:29', '2026-03-19 05:48:38'),
(110, 16, 'Smartphone', 'gadgets', 'ip 17', '2026-08-21', '22:55:00', 'Caranglaan', '/uploads/1787324120442.jpeg', 0, 'tapat elem', 'Found', 'Adriane', 'Tuliao', '09776928040', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-08-21 14:55:20'),
(113, 16, 'Smartphone', 'gadgets', 'ip 15 pro max', '2026-08-23', '23:23:00', 'Mayombo', '/uploads/1787498646850.png', 0, 'puregold tapat', 'Found', 'Adriane', 'Tuliao', '09776928040', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-08-23 15:24:06'),
(114, 18, 'Smartphone', 'gadgets', 'Iphone 15 pro max', '2026-08-23', '23:35:00', 'Mayombo', '/uploads/1787499337248.png', 0, 'nawala ko sa may puregold', 'Lost', 'James Marvin', 'Mandapat', '09959388798', 'marvinmandapat777@gmail.com', 'Resolved', 0, NULL, '2026-08-23 15:35:37'),
(115, 16, 'Smartphone', 'gadgets', 'Iphone', '2026-08-29', '10:09:00', 'Tapuac', '/uploads/1787969427847.png', 0, 'Nawala ko around tapuac', 'Lost', 'Adriane', 'Tuliao', '09776928040', 'tuliao.maradriane.m@gmail.com', 'Pending Approval', 0, NULL, '2026-08-29 02:10:27'),
(118, 22, 'Leather Wallet', 'wallet', 'Penshoppe', '2026-09-12', '08:53:00', 'Tapuac', '/uploads/1789174431868.jpeg', 0, 'Tapuac', 'Found', 'Aj', 'Datuin', '09959388798', 'tuliao.ian.14@gmail.com', 'Published', 0, NULL, '2026-09-12 00:53:51'),
(119, 16, 'Brown Leather Wallet', 'wallet', 'Penshoppe', '2026-09-12', '08:58:00', 'Tapuac', '/uploads/1789174739671.jpeg', 0, 'I lost around 7/11 tapuac', 'Lost', 'Adriane', 'Tuliao', '09776928040', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-09-12 00:58:59'),
(127, 16, 'Smartphone', 'gadgets', 'Iphon 17 pro max', '2026-10-15', '14:02:00', 'Caranglaan', '/uploads/1791828193758.jpg', 0, 'nawala ko po', 'Lost', 'Adriane', 'Tuliao', '09959388798', 'tuliao.maradriane.m@gmail.com', 'Published', 0, NULL, '2026-10-12 18:03:13'),
(128, 22, 'Smartphone', 'gadgets', 'Iphone 17 pro max', '2026-10-15', '16:08:00', 'Caranglaan', '/uploads/1791828536503.jpg', 0, '', 'Found', 'Aj', 'Datuin', '09959388798', 'tuliao.ian.14@gmail.com', 'Published', 0, NULL, '2026-10-12 18:08:56');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `conversation_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `message_type` varchar(10) NOT NULL DEFAULT 'text',
  `image_url` varchar(255) DEFAULT NULL,
  `is_sensitive` tinyint(1) NOT NULL DEFAULT 0,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `conversation_id`, `sender_id`, `message`, `message_type`, `image_url`, `is_sensitive`, `is_read`, `created_at`) VALUES
(27, 9, 22, 'Hi, I believe that this is my item.', 'text', NULL, 0, 1, '2026-09-11 08:53:48'),
(28, 9, 16, 'what proof can you send that it is yours?', 'text', NULL, 0, 1, '2026-09-11 08:54:11'),
(29, 9, 22, '(proof)', 'text', NULL, 0, 1, '2026-09-11 08:54:16'),
(30, 9, 16, 'okay let\'s both agree', 'text', NULL, 0, 1, '2026-09-11 08:54:25'),
(31, 9, 22, 'Confirm Item', 'text', NULL, 0, 1, '2026-09-11 08:54:34'),
(32, 9, 16, 'Confirm Item', 'text', NULL, 0, 1, '2026-09-11 08:54:40'),
(33, 9, 22, 'where to? (date, time, place)', 'text', NULL, 0, 1, '2026-09-11 08:55:03'),
(34, 9, 16, 'okay', 'text', NULL, 0, 1, '2026-09-11 08:55:06'),
(35, 9, 22, 'done?', 'text', NULL, 0, 1, '2026-09-11 09:15:04'),
(36, 9, 22, 'thanks for the successful transaction.', 'text', NULL, 0, 1, '2026-09-11 09:19:54'),
(37, 12, 16, 'I think this is mine?', 'text', NULL, 0, 1, '2026-09-12 00:54:25'),
(38, 12, 22, 'send your proof', 'text', NULL, 0, 1, '2026-09-12 00:54:42'),
(39, 12, 16, '(proof)', 'text', NULL, 0, 1, '2026-09-12 00:54:57'),
(40, 12, 16, 'Confirm Item', 'text', NULL, 0, 1, '2026-09-12 00:55:05'),
(41, 12, 22, 'Confirm Item', 'text', NULL, 0, 1, '2026-09-12 00:55:10'),
(43, 12, 16, 'Adriane Tuliao requested to reschedule the meetup: \"Something came up very important sorry for wasting time\". Both parties need to agree again.', 'text', NULL, 0, 1, '2026-09-30 13:07:11'),
(44, 12, 16, '', 'image', '/uploads/1790773800661.jpeg', 1, 1, '2026-09-30 13:10:00'),
(45, 9, 16, 'resched', 'text', NULL, 0, 1, '2026-10-12 07:07:46'),
(46, 9, 16, 'Adriane Tuliao requested to reschedule the meetup. Both parties need to agree again.', 'text', NULL, 0, 1, '2026-10-12 07:08:36'),
(47, 13, 16, 'Good day, I think this is my lost item!', 'text', NULL, 0, 1, '2026-10-12 18:10:53'),
(48, 13, 22, 'sure set a date?', 'text', NULL, 0, 1, '2026-10-12 18:11:07'),
(49, 13, 16, 'DATE', 'text', NULL, 0, 0, '2026-10-13 00:26:14');

-- --------------------------------------------------------

--
-- Table structure for table `message_image_views`
--

CREATE TABLE `message_image_views` (
  `message_id` int(11) NOT NULL,
  `viewer_id` int(11) NOT NULL,
  `view_count` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `message_image_views`
--

INSERT INTO `message_image_views` (`message_id`, `viewer_id`, `view_count`) VALUES
(44, 22, 2);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `contact_number` varchar(20) DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `suspend_reasons` text DEFAULT NULL,
  `suspended_until` datetime DEFAULT NULL,
  `status` enum('active','deactivated','suspended') NOT NULL DEFAULT 'active',
  `profile_picture` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `name`, `email`, `password`, `created_at`, `contact_number`, `dob`, `suspend_reasons`, `suspended_until`, `status`, `profile_picture`) VALUES
(1, 'marvin1', 'Marvin Mandapat', 'marvin@example.com', '$2b$10$uicqCllSWz0ZzfyzN96kQ.tPDe4kUI9cUVfS/O4TXZLICUX3LHW9q', '2026-01-30 15:56:05', '09000000000', '2004-05-14', NULL, NULL, 'active', NULL),
(2, 'ian', 'Adriane Tuliao', 'adriane@example.com', '$2b$10$Y4pY6Y5MAQkrSVUVWqATpurz3PYKUqG8jU3G6vGCz42fcN4vXrapu', '2026-02-02 15:55:43', '09000000000', '2004-05-14', NULL, NULL, 'active', NULL),
(3, '', 'Ian Test', 'Ian@example.com', '$2b$10$O7QoD4oxqkRqgVZ7W251cOjdXw0OAFkT5Ikc4dwnRC9EwzcZFGDQi', '2026-02-20 17:06:40', '09123456789', '2004-05-15', NULL, NULL, 'active', NULL),
(5, '', 'ian ilokano', 'ianilokano@example.com', '$2b$10$euNvpmMVpJNHrUF2A7dTzOk6JSkei5iYeI0EiDGiBMJ8fczexxl42', '2026-02-20 17:16:26', '09776928040', '2004-01-20', NULL, NULL, 'active', NULL),
(6, '', 'Rodas, Piolo', 'pandonthitsdiff@gmail.com', '$2b$10$TZzt3xx7tv3z6SP7nwF.Veb/UdZvMPTV5fBB0E5ufy71RB4LB1d.O', '2026-02-21 01:19:20', '09663169715', '2005-02-21', NULL, NULL, 'active', NULL),
(8, '', 'Tuliao, Mar Adriane', 'pandot@gmail.com', '$2b$10$LiLW00mz.bEUp4jrWv4UdeEVnGPxpFvF64W9.Nuo8IVmcS4a1Jj9C', '2026-02-21 04:09:16', '09000000000', '2026-02-21', NULL, NULL, 'active', NULL),
(16, 'AdrianeTuliao', 'Adriane Tuliao', 'tuliao.maradriane.m@gmail.com', '$2b$10$lCb0BUlZXIgVHHpTjFg2zeSQw7Lbu96IavPZYkYsBgJjyF80xkKLG', '2026-03-06 02:41:36', '09959388798', '2004-05-07', NULL, NULL, 'active', '/uploads/avatars/user-16-1792059138926.jpg'),
(18, 'jamesmarvin01', 'Mandapat, James Marvin', 'marvinmandapat777@gmail.com', '$2b$10$1W42w9Tppb.fYOjXR0VJlu69c2sAfnUgh0PXIOjIRMKKn.b0x4qeC', '2026-03-17 10:18:44', '09959388798', '2004-08-09', NULL, NULL, 'active', NULL),
(19, 'lambinohanss01', 'Lambino, Hans', 'hanslambino3@gmail.com', '$2b$10$HnKJwcJO.IkqG.vUOyLBLutTJ9gStFUik1yVnw7WsIMPvhOMnPf3S', '2026-03-19 05:40:28', '09959388798', '2004-05-12', NULL, NULL, 'active', NULL),
(22, 'ajii01', 'Datuin, Aj', 'tuliao.ian.14@gmail.com', '$2b$10$S9o/TMZBiDna0Bdkc/rNpum9B2WAYFwlzi/MdwyQF5t3aLti/23Bq', '2026-08-29 04:29:11', '09959388798', '2000-04-01', NULL, NULL, 'active', NULL),
(23, 'Kramyr', 'Napao, Mark', 'Markanapao@gmail.com', '$2b$10$CTjtjxkxGslLlzFe8ASu9u9ff7SL7Iwl3VAWGrf1ZXQeb9GhlaqrG', '2026-09-19 00:13:15', '09561506744', '2001-12-31', NULL, NULL, 'active', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_notifications`
--

CREATE TABLE `user_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `type` enum('Published','Denied','Resolved','Comment','Message') NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `conversation_id` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_notifications`
--

INSERT INTO `user_notifications` (`id`, `user_id`, `item_id`, `message`, `type`, `is_read`, `created_at`, `conversation_id`) VALUES
(1, 16, 67, 'Your report for \"ID\" has been published.', 'Published', 1, '2026-03-13 15:42:46', NULL),
(2, 16, 66, 'Your report for \"ID\" has been published.', 'Published', 1, '2026-03-13 15:43:46', NULL),
(4, 16, 68, 'Your report for \"Bag\" has been published.', 'Published', 1, '2026-03-17 09:21:18', NULL),
(5, 16, 72, 'Your report for \"asdasd\" has been denied.', 'Denied', 1, '2026-03-17 10:24:17', NULL),
(6, 18, 75, 'Your report for \"Driver\'s License\" has been published.', 'Published', 0, '2026-03-17 10:30:53', NULL),
(7, 16, 78, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 15:04:46', NULL),
(8, 16, 66, 'Your report for \"ID\" has been resolved.', 'Resolved', 1, '2026-03-18 15:43:08', NULL),
(9, 16, 77, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 16:46:56', NULL),
(10, 16, 76, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 16:58:25', NULL),
(11, 16, 78, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 16:59:52', NULL),
(12, 16, 77, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 17:10:09', NULL),
(13, 16, 76, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 17:10:21', NULL),
(14, 16, 79, 'Your report for \"12411241\" has been published.', 'Published', 1, '2026-03-18 17:12:51', NULL),
(15, 16, 79, 'Your report for \"12411241\" has been resolved.', 'Resolved', 1, '2026-03-18 17:13:07', NULL),
(16, 16, 80, 'Your report for \"bag\" has been published.', 'Published', 1, '2026-03-18 17:17:44', NULL),
(17, 16, 80, 'Your report for \"bag\" has been resolved.', 'Resolved', 1, '2026-03-18 17:18:07', NULL),
(18, 16, 81, 'Your report for \"Phone\" has been published.', 'Published', 1, '2026-03-18 17:20:54', NULL),
(19, 16, 82, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 17:22:48', NULL),
(20, 16, 82, 'Your report for \"Smartphone\" has been resolved.', 'Resolved', 1, '2026-03-18 17:29:05', NULL),
(21, 16, 81, 'Your report for \"Phone\" has been resolved.', 'Resolved', 1, '2026-03-18 17:30:58', NULL),
(22, 16, 83, 'Your report for \"Bag\" has been published.', 'Published', 1, '2026-03-18 17:33:10', NULL),
(23, 16, 82, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 17:39:17', NULL),
(24, 16, 84, 'Your report for \"12313\" has been published.', 'Published', 1, '2026-03-18 17:40:24', NULL),
(25, 16, 85, 'Your report for \"Bag\" has been published.', 'Published', 1, '2026-03-18 17:45:52', NULL),
(26, 16, 87, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 17:56:54', NULL),
(27, 16, 89, 'Your report for \"phone\" has been published.', 'Published', 1, '2026-03-18 18:15:54', NULL),
(28, 16, 88, 'Your report for \"124124\" has been published.', 'Published', 1, '2026-03-18 18:16:11', NULL),
(29, 16, 86, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 18:28:17', NULL),
(30, 16, 90, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 18:30:09', NULL),
(31, 16, 91, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 18:39:54', NULL),
(32, 16, 91, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 18:40:07', NULL),
(33, 16, 92, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 18:58:23', NULL),
(34, 16, 92, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 18:58:36', NULL),
(35, 16, 93, 'Your report for \"ID\" has been published.', 'Published', 1, '2026-03-18 19:00:55', NULL),
(36, 16, 93, 'Your report for \"ID\" has been resolved.', 'Resolved', 1, '2026-03-18 19:00:58', NULL),
(37, 16, 94, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 19:02:01', NULL),
(38, 16, 94, 'Your report for \"Smartphone\" has been resolved.', 'Resolved', 1, '2026-03-18 19:02:06', NULL),
(39, 16, 95, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 19:07:37', NULL),
(40, 16, 95, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 19:07:43', NULL),
(41, 16, 96, 'Your report for \"12414\" has been published.', 'Published', 1, '2026-03-18 19:09:27', NULL),
(42, 16, 96, 'Your report for \"12414\" has been resolved.', 'Resolved', 1, '2026-03-18 19:09:30', NULL),
(43, 16, 97, 'Your report for \"14141\" has been published.', 'Published', 1, '2026-03-18 19:12:13', NULL),
(44, 16, 97, 'Your report for \"14141\" has been resolved.', 'Resolved', 1, '2026-03-18 19:12:15', NULL),
(45, 16, 98, 'Your report for \"Phone\" has been published.', 'Published', 1, '2026-03-18 19:15:24', NULL),
(46, 16, 98, 'Your report for \"Phone\" has been resolved.', 'Resolved', 1, '2026-03-18 19:15:26', NULL),
(47, 16, 99, 'Your report for \"Wallet\" has been published.', 'Published', 1, '2026-03-18 19:25:02', NULL),
(48, 16, 99, 'Your report for \"Wallet\" has been resolved.', 'Resolved', 1, '2026-03-18 19:25:08', NULL),
(49, 16, 100, 'Your report for \"Bag\" has been published.', 'Published', 1, '2026-03-18 19:27:34', NULL),
(50, 16, 100, 'Your report for \"Bag\" has been resolved.', 'Resolved', 1, '2026-03-18 19:27:41', NULL),
(51, 16, 101, 'Your report for \"Smartphone\" has been published.', 'Published', 1, '2026-03-18 19:30:58', NULL),
(52, 16, 101, 'Your report for \"Smartphone\" has been resolved.', 'Resolved', 1, '2026-03-18 19:31:02', NULL),
(53, 16, 109, 'May nakitang kaparehong lost item sa Caranglaan! I-check ang match updates.', 'Published', 1, '2026-08-21 14:41:40', NULL),
(54, 5, 109, 'May bagong found report sa Caranglaan (Smartphone) na pwedeng tumugma sa post mo!', 'Published', 0, '2026-08-21 14:41:40', NULL),
(55, 16, 12, 'May nakitang kaparehong lost item sa Caranglaan! I-check ang match updates.', 'Published', 1, '2026-08-21 14:55:37', NULL),
(56, 5, 110, 'May bagong found report sa Caranglaan (Smartphone) na pwedeng tumugma sa post mo!', 'Published', 0, '2026-08-21 14:55:37', NULL),
(57, 16, 8, 'A matching lost item was found in Mayombo! Check match updates.', 'Published', 1, '2026-08-23 14:24:23', NULL),
(58, 1, 111, 'A new found report in Mayombo (Smartphone) might match your post!', 'Published', 0, '2026-08-23 14:24:23', NULL),
(59, 16, 8, 'A matching lost item was found in Mayombo! Check match updates.', 'Published', 1, '2026-08-23 15:18:39', NULL),
(60, 1, 112, 'A new found report in Mayombo (Smartphone) might match your post!', 'Published', 0, '2026-08-23 15:18:39', NULL),
(61, 16, 8, 'A matching lost item was found in Mayombo! Check match updates.', 'Published', 1, '2026-08-23 15:24:34', NULL),
(62, 1, 113, 'A new found report in Mayombo (Smartphone) might match your post!', 'Published', 0, '2026-08-23 15:24:34', NULL),
(63, 18, 113, 'Possible item match! A found item was found in Mayombo. Check match updates.', 'Published', 1, '2026-08-23 15:36:09', NULL),
(64, 16, 114, 'Possible item match! A new lost report in Mayombo (Smartphone) might match your post.', 'Published', 1, '2026-08-23 15:36:09', NULL),
(65, 16, 110, 'Your ReFoundly transaction for \"Smartphone\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-11 04:26:22', 7),
(66, 22, 110, 'Your ReFoundly transaction for \"Smartphone\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-11 04:26:22', 7),
(67, 16, 110, 'New message: Hi, I believe that this is my item.', 'Published', 1, '2026-09-11 08:53:48', 9),
(68, 22, 110, 'New message: what proof can you send that it is yours?', 'Published', 1, '2026-09-11 08:54:11', 9),
(69, 16, 110, 'New message: (proof)', 'Published', 1, '2026-09-11 08:54:16', 9),
(70, 22, 110, 'New message: okay let\'s both agree', 'Published', 1, '2026-09-11 08:54:25', 9),
(71, 16, 110, 'New message: Confirm Item', 'Published', 1, '2026-09-11 08:54:34', 9),
(72, 22, 110, 'New message: Confirm Item', 'Published', 1, '2026-09-11 08:54:40', 9),
(73, 16, 110, 'New message: where to? (date, time, place)', 'Published', 1, '2026-09-11 08:55:03', 9),
(74, 22, 110, 'New message: okay', 'Published', 1, '2026-09-11 08:55:06', 9),
(75, 16, 110, 'Your ReFoundly transaction for \"Smartphone\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-11 08:56:12', 9),
(76, 22, 110, 'Your ReFoundly transaction for \"Smartphone\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-11 08:56:12', 9),
(77, 16, 110, 'New message: done?', 'Published', 1, '2026-09-11 09:15:04', 9),
(78, 16, 110, 'New message from Datuin, Aj: thanks for the successful transaction.', 'Published', 1, '2026-09-11 09:19:54', 9),
(79, 16, 116, 'Possible item match! A found item was found in Tapuac. Check match updates.', 'Published', 1, '2026-09-11 13:42:18', NULL),
(80, 22, 117, 'Possible item match! A new lost report in Tapuac (Brown Leather Wallet) might match your post.', 'Published', 1, '2026-09-11 13:42:18', NULL),
(81, 22, 118, 'New message from Adriane Tuliao: I think this is mine?', 'Published', 1, '2026-09-12 00:54:25', 12),
(82, 16, 118, 'New message from Datuin, Aj: send your proof', 'Published', 1, '2026-09-12 00:54:42', 12),
(83, 22, 118, 'New message from Adriane Tuliao: (proof)', 'Published', 1, '2026-09-12 00:54:57', 12),
(84, 22, 118, 'New message from Adriane Tuliao: Confirm Item', 'Published', 1, '2026-09-12 00:55:05', 12),
(85, 16, 118, 'New message from Datuin, Aj: Confirm Item', 'Published', 1, '2026-09-12 00:55:10', 12),
(86, 16, 118, 'Your ReFoundly transaction for \"Leather Wallet\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-12 00:56:18', 12),
(87, 22, 118, 'Your ReFoundly transaction for \"Leather Wallet\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-12 00:56:18', 12),
(88, 16, 118, 'Possible item match! A found item was found in Tapuac. Check match updates.', 'Published', 1, '2026-09-12 00:59:32', NULL),
(89, 22, 119, 'Possible item match! A new lost report in Tapuac (Brown Leather Wallet) might match your post.', 'Published', 1, '2026-09-12 00:59:32', NULL),
(90, 22, 118, 'New message from Adriane Tuliao: <script>alert<(\'XSS\')</script?', 'Published', 1, '2026-09-24 10:14:34', 12),
(91, 22, 118, 'Adriane Tuliao requested to reschedule your meetup for \"Tapuac Barangay Hall\". Please review and agree again.', 'Published', 1, '2026-09-30 13:07:11', 12),
(92, 16, 118, 'Your ReFoundly transaction for \"Leather Wallet\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-30 13:08:38', 12),
(93, 22, 118, 'Your ReFoundly transaction for \"Leather Wallet\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-09-30 13:08:38', 12),
(94, 22, 118, 'New message from Adriane Tuliao: 📎 Sent a sensitive photo', 'Published', 1, '2026-09-30 13:10:00', 12),
(95, 22, 110, 'New message from Adriane Tuliao: resched', 'Published', 1, '2026-10-12 07:07:46', 9),
(96, 22, 110, 'Adriane Tuliao requested to reschedule your meetup for \"Caranglaan Barangay Hall\". Please review and agree again.', 'Published', 1, '2026-10-12 07:08:36', 9),
(97, 16, 110, 'Your ReFoundly transaction for \"Smartphone\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-10-12 08:31:03', 9),
(98, 22, 110, 'Your ReFoundly transaction for \"Smartphone\" has been confirmed. View the report in your chat.', 'Published', 1, '2026-10-12 08:31:03', 9),
(99, 22, 12, 'Possible item match! A lost item was found in Caranglaan. Check match updates.', 'Published', 1, '2026-10-12 18:09:17', NULL),
(100, 5, 128, 'Possible item match! A new found report in Caranglaan (Smartphone) might match your post.', 'Published', 0, '2026-10-12 18:09:17', NULL),
(101, 16, 128, 'Possible item match! A new found report in Caranglaan (Smartphone) might match your post.', 'Published', 1, '2026-10-12 18:09:17', NULL),
(102, 22, 128, 'New message from Adriane Tuliao: Good day, I think this is my lost item!', 'Published', 1, '2026-10-12 18:10:53', 13),
(103, 16, 128, 'New message from Datuin, Aj: sure set a date?', 'Published', 1, '2026-10-12 18:11:07', 13),
(104, 22, 128, 'New message from Adriane Tuliao: DATE', 'Published', 1, '2026-10-13 00:26:14', 13);

-- --------------------------------------------------------

--
-- Table structure for table `user_reports`
--

CREATE TABLE `user_reports` (
  `id` int(11) NOT NULL,
  `reporter_id` int(11) NOT NULL,
  `reported_user_id` int(11) NOT NULL,
  `conversation_id` int(11) DEFAULT NULL,
  `reason` varchar(30) NOT NULL,
  `details` varchar(500) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `user_reports`
--

INSERT INTO `user_reports` (`id`, `reporter_id`, `reported_user_id`, `conversation_id`, `reason`, `details`, `status`, `created_at`) VALUES
(1, 16, 22, 9, 'fake_item', 'fake', 'reviewed', '2026-10-12 10:19:19');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admins`
--
ALTER TABLE `admins`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `admin_id` (`admin_id`);

--
-- Indexes for table `conversations`
--
ALTER TABLE `conversations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_item_conversation` (`item_id`,`user_one_id`,`user_two_id`),
  ADD KEY `idx_user_one` (`user_one_id`),
  ADD KEY `idx_user_two` (`user_two_id`),
  ADD KEY `idx_item` (`item_id`);

--
-- Indexes for table `items`
--
ALTER TABLE `items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_conversation` (`conversation_id`),
  ADD KEY `idx_sender` (`sender_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indexes for table `message_image_views`
--
ALTER TABLE `message_image_views`
  ADD PRIMARY KEY (`message_id`,`viewer_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `user_reports`
--
ALTER TABLE `user_reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reported_user` (`reported_user_id`),
  ADD KEY `idx_status` (`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admins`
--
ALTER TABLE `admins`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=414;

--
-- AUTO_INCREMENT for table `conversations`
--
ALTER TABLE `conversations`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `items`
--
ALTER TABLE `items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=129;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=50;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `user_notifications`
--
ALTER TABLE `user_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=105;

--
-- AUTO_INCREMENT for table `user_reports`
--
ALTER TABLE `user_reports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `audit_logs_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `conversations`
--
ALTER TABLE `conversations`
  ADD CONSTRAINT `conversations_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversations_ibfk_2` FOREIGN KEY (`user_one_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `conversations_ibfk_3` FOREIGN KEY (`user_two_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `items`
--
ALTER TABLE `items`
  ADD CONSTRAINT `items_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD CONSTRAINT `user_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
