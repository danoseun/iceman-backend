import pusher from '../config/pusher';
import Notifications from '../utils/Notifications';
import Response from '../utils/response';
import sendMail from './emailService';
import { Notification, User } from '../models';


const { error } = Response;

/**
 * Notification service class
 */
export default class NotificationService {
  /**
   * @param {object} sender - sender object
   * @param {object} receiver - receiver object
   * @param {String} url - url link
   * @param {String} type - notification type
   * @return {null} - null
   */
  static async createNotificationMsg({
    sender, receiver, link, type
  }) {
    // App notification function
    const sendAppNotification = (id, title, message, url) => {
      pusher.trigger('notifications', `event-${id}`, {
        title, message, url
      });
      console.log('i am here');
    };

    // Email notification Function
    const sendEmailNotification = async (title, message, url) => {
      const userDetails = {
        receiver: receiver.email,
        sender: `${title} <notification@barefootnomad.com>`,
        templateName: 'notification',
        url,
        msg: message,
        name: `${sender.firstName} ${sender.lastName}`
      };

      await sendMail(userDetails);
    };

    const notificationMessage = Notifications(type, sender, link);
    const { title, message, url, } = notificationMessage;

    await Notification.create({
      message,
      url,
      senderId: sender.id,
      receiverId: receiver.id,
      type
    });

    if (receiver.emailNotify) {
      await sendEmailNotification(title, message, url);
    }

    await sendAppNotification(receiver.id, title, message, url);
  }

  /**
   *
   * @param {object} req request object
   * @returns {String} reponse message
   */
  static async optEmailNotification(req) {
    const { id } = req.user;
    const { emailNotification } = req.body;
    const data = await User.findOne({ where: { id } });

    if (!data) error('User not Found');

    await User.update({ emailNotify: emailNotification }, { where: { id } });

    return 'Email Notification status successfully updated';
  }
}
