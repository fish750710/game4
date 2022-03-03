
// 控制字号
(function (doc, win) {
  var docEl = doc.documentElement,
    // 手机旋转事件,大部分手机浏览器都支持 onorientationchange 如果不支持，可以使用原始的 resize
    resizeEvt =
      "orientationchange" in window ? "orientationchange" : "resize",
    recalc = function () {
      //clientWidth: 获取对象可见内容的宽度，不包括滚动条，不包括边框
      var clientWidth = docEl.clientWidth;
      if (!clientWidth) return;
      if (window.innerWidth <= 768) {
        document.documentElement.style.fontSize = clientWidth / 7.68 + "px";          
      } else if (window.innerWidth >= 1920) {
        document.documentElement.style.fontSize = 1920 / 19.2 + "px";
      } else {
        document.documentElement.style.fontSize = clientWidth / 19.2 + "px";
      }
    };

  recalc();
  //判断是否支持监听事件 ，不支持则停止
  if (!doc.addEventListener) return;
  //注册翻转事件
  win.addEventListener(resizeEvt, recalc, false);
})(document, window);


var Com = {
/**
     * 判断设备
     * */
    browserRedirect: function(){
      var sUserAgent = navigator.userAgent.toLowerCase();
      var bIsIpad = sUserAgent.match(/ipad/i) == "ipad";
      var bIsIphoneOs = sUserAgent.match(/iphone os/i) == "iphone os";
      var bIsMidp = sUserAgent.match(/midp/i) == "midp";
      var bIsUc7 = sUserAgent.match(/rv:1.2.3.4/i) == "rv:1.2.3.4";
      var bIsUc = sUserAgent.match(/ucweb/i) == "ucweb";
      var bIsAndroid = sUserAgent.match(/android/i) == "android";
      var bIsCE = sUserAgent.match(/windows ce/i) == "windows ce";
      var bIsWM = sUserAgent.match(/windows mobile/i) == "windows mobile";
      if (bIsIpad || bIsIphoneOs || bIsMidp || bIsUc7 || bIsUc || bIsAndroid || bIsCE || bIsWM) {
          // document.writeln("phone");
          return true;
      } else {
          // document.writeln("pc");
          return false;
      }
  }
}


var fr=QueryString("from");
var thisUrl = window.location.toString();
$(function(){
	if(fr=='app'){
		$('.bookmark,.header_mob,.header,.head-wrap').remove();
		$('.myfooter').hide();
	}
	$('.lp_close').click(function (){
		$('.lp_right').fadeOut();
		$('.lp_right_small').fadeIn();
	});
	$('.lp_right_small').click(function (){
		$(this).fadeOut();
		$('.lp_right').fadeIn();
	});
});
var str ='';
var gts2_str = '&curplat=GTS2';
if(thisUrl.indexOf("?")>-1){
	$(".btn-real,.btn_real").each(function(index){
		var real_url = $(this).attr("href").indexOf("?")>-1?$(this).attr("href")+"&"+thisUrl.split("?")[1]:$(this).attr("href")+"?"+thisUrl.split("?")[1];
		$(this).attr("href",real_url+str);
	});
}else{
	
	$(".btn-real,.btn_real").each(function(index){
		var real_url = $(this).attr("href").indexOf("?")>-1?$(this).attr("href") :$(this).attr("href")+'?';
		$(this).attr("href",real_url);
	});
}

function QueryString(item) {
    var sValue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)", "i"))
    return sValue ? sValue[1] : sValue
}

/*倒计时*/
// function countDownNew(endT, showtimeBox, tcolor, disp) {
//     function double(num) {
//         if (num < 10) {
//             return "0" + num;
//         } else {
//             return "" + num;
//         }
//     }
// 	$("." + showtimeBox).before('<div class="bn-countdown" id="bn-countdown" ><span class="close">×</span><div class="bn-countdownbox"><span class="remain">距离活动结束剩：</span><span><i class="bn-day"><strong></strong></i>天</span><span><i class="bn-hour"><strong></strong></i>时</span><span><i class="bn-min"><strong></strong></i>分</span><span><i class="bn-sec"><strong></strong></i> 秒</span></div></div>');

//     function goTime() {
//         var t = new Date(endT).getTime() - new Date().getTime(),
//             d = Math.floor(t / 1000 / 60 / 60 / 24),
//             h = Math.floor(t / 1000 / 60 / 60 % 24),
//             m = Math.floor(t / 1000 / 60 % 60),
//             s = Math.floor(t / 1000 % 60);

//         if (t > 0) {
//             $("#bn-countdown").show();
// 			$(".bn-day strong").html(double(d));
//             $(".bn-hour strong").html(double(h));
//             $(".bn-min strong").html(double(m));
//             $(".bn-sec strong").html(double(s));
//         } else if (disp != '' && disp == "hide") {
//             $("#bn-countdown").remove();
//         } else {
//             $("#bn-countdown").show().html("<span class='time_over'>活动已结束!</span>");
//         }
// 		if (tcolor != ''){
// 			$(".bn-countdown p,.time_over").css("color",tcolor);
// 		}
//     }

//     var cd_interval = setInterval(goTime,1000);
	
// 	$(".bn-countdown").click(function(){
// 		$(this).hide();
// 		clearInterval(cd_interval);
// 	})
// }
